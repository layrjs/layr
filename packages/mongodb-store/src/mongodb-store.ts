import {
  Store,
  StorableLike,
  CreateDocumentParams,
  ReadDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  FindDocumentsParams,
  CountDocumentsParams,
  Document,
  Query,
  Expression,
  Path,
  Operator,
  Operand,
  SortDescriptor,
  SortDirection
} from '@layr/store';
import {ensureComponentInstance} from '@layr/component';
import {MongoClient, Db, Collection, FilterQuery, FindOneOptions} from 'mongodb';
import {Microbatcher, Operation} from 'microbatcher';
import {hasOwnProperty, assertIsObjectLike} from 'core-helpers';
import isEmpty from 'lodash/isEmpty';
import mapKeys from 'lodash/mapKeys';
import mapValues from 'lodash/mapValues';
import escapeRegExp from 'lodash/escapeRegExp';
import groupBy from 'lodash/groupBy';
import debugModule from 'debug';

const debug = debugModule('layr:mongodb-store');
// To display the debug log, set this environment:
// DEBUG=layr:mongodb-store DEBUG_DEPTH=10

const MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME = '_id';

/**
 * *Inherits from [`Store`](https://layrjs.com/docs/v1/reference/store).*
 *
 * A [`Store`](https://layrjs.com/docs/v1/reference/store) that uses a [MongoDB](https://www.mongodb.com/) database to persist its registered [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class).
 *
 * #### Usage
 *
 * Create a `MongoDBStore` instance, register some [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class) into it, and then use any [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class)'s method to load, save, delete, or find components from the store.
 *
 * For example, let's build a simple `Backend` that provides a `Movie` component.
 *
 * First, let's define the components that we are going to use:
 *
 * ```
 * // JS
 *
 * import {Component} from '﹫layr/component';
 * import {Storable, primaryIdentifier, attribute} from '@layr/storable';
 *
 * class Movie extends Storable(Component) {
 *   @primaryIdentifier() id;
 *
 *   @attribute() title = '';
 * }
 *
 * class Backend extends Component {
 *   ﹫provide() static Movie = Movie;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '﹫layr/component';
 * import {Storable, primaryIdentifier, attribute} from '@layr/storable';
 *
 * class Movie extends Storable(Component) {
 *   @primaryIdentifier() id!: string;
 *
 *   @attribute() title = '';
 * }
 *
 * class Backend extends Component {
 *   ﹫provide() static Movie = Movie;
 * }
 * ```
 *
 * Next, let's create a `MongoDBStore` instance, and let's register the `Backend` component as the root component of the store:
 *
 * ```
 * import {MongoDBStore} from '﹫layr/mongodb-store';
 *
 * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
 *
 * store.registerRootComponent(Backend);
 * ```
 *
 * Finally, we can interact with the store by calling some [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class) methods:
 *
 * ```
 * let movie = new Movie({id: 'abc123', title: 'Inception'});
 *
 * // Save the movie to the store
 * await movie.save();
 *
 * // Get the movie from the store
 * movie = await Movie.get('abc123');
 * movie.title; // => 'Inception'
 *
 * // Modify the movie, and save it to the store
 * movie.title = 'Inception 2';
 * await movie.save();
 *
 * // Find the movies that have a title starting with 'Inception'
 * const movies = await Movie.find({title: {$startsWith: 'Inception'}});
 * movies.length; // => 1 (one movie found)
 * movies[0].title; // => 'Inception 2'
 * movies[0] === movie; // true (thanks to the identity mapping)
 *
 * // Delete the movie from the store
 * await movie.delete();
 * ```
 */
export class MongoDBStore extends Store {
  private _connectionString: string;
  private _poolSize: number;

  /**
   * Creates a [`MongoDBStore`](https://layrjs.com/docs/v1/reference/mongodb-store).
   *
   * @param connectionString The [connection string](https://docs.mongodb.com/manual/reference/connection-string/) of the MongoDB database to use.
   * @param [options.poolSize] A number specifying the maximum size of the connection pool (default: `1`).
   *
   * @returns The [`MongoDBStore`](https://layrjs.com/docs/v1/reference/mongodb-store) instance that was created.
   *
   * @example
   * ```
   * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
   * ```
   *
   * @category Creation
   */
  constructor(connectionString: string, options: {poolSize?: number} = {}) {
    const {poolSize = 1, ...otherOptions} = options;

    super(otherOptions);

    this._connectionString = connectionString;
    this._poolSize = poolSize;
  }

  // === Component Registration ===

  /**
   * See the methods that are inherited from the [`Store`](https://layrjs.com/docs/v1/reference/store#component-registration) class.
   *
   * @category Component Registration
   */

  // === Connection ===

  /**
   * Initiates a connection to the MongoDB database.
   *
   * Since this method is called automatically when you interact with the store through any of the [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class) methods, you shouldn't have to call it manually.
   *
   * @category Connection to MongoDB
   */
  async connect() {
    await this._connectClient();
  }

  /**
   * Closes the connection to the MongoDB database. Unless you are building a tool that uses a store for an ephemeral duration, you shouldn't have to call this method.
   *
   * @category Connection to MongoDB
   */
  async disconnect() {
    await this._disconnectClient();
  }

  // === Documents ===

  async createDocument({collectionName, document}: CreateDocumentParams) {
    const collection = await this._getCollection(collectionName);

    try {
      const {insertedCount} = await debugCall(
        async () => {
          const {insertedCount} = await collection.insertOne(document);

          return {insertedCount};
        },
        'db.%s.insertOne(%o)',
        collectionName,
        document
      );

      return insertedCount === 1;
    } catch (error) {
      if (error.name === 'MongoError' && error.code === 11000) {
        return false; // The document already exists
      }

      throw error;
    }
  }

  async readDocument({
    collectionName,
    identifierDescriptor,
    projection
  }: ReadDocumentParams): Promise<Document | undefined> {
    const collection = await this._getCollection(collectionName);

    const query = identifierDescriptor;
    const options = {projection};

    const document: Document | null = await debugCall(
      async () => await batchableFindOne(collection, query, options),
      'db.%s.batchableFindOne(%o, %o)',
      collectionName,
      query,
      options
    );

    if (document === null) {
      return undefined;
    }

    return document;
  }

  async updateDocument({
    collectionName,
    identifierDescriptor,
    documentPatch
  }: UpdateDocumentParams) {
    const collection = await this._getCollection(collectionName);

    const filter = identifierDescriptor;

    const {matchedCount} = await debugCall(
      async () => {
        const {matchedCount, modifiedCount} = await collection.updateOne(filter, documentPatch);

        return {matchedCount, modifiedCount};
      },
      'db.%s.updateOne(%o, %o)',
      collectionName,
      filter,
      documentPatch
    );

    return matchedCount === 1;
  }

  async deleteDocument({collectionName, identifierDescriptor}: DeleteDocumentParams) {
    const collection = await this._getCollection(collectionName);

    const filter = identifierDescriptor;

    const {deletedCount} = await debugCall(
      async () => {
        const {deletedCount} = await collection.deleteOne(filter);

        return {deletedCount};
      },
      'db.%s.deleteOne(%o)',
      collectionName,
      filter
    );

    return deletedCount === 1;
  }

  async findDocuments({
    collectionName,
    expressions,
    projection,
    sort,
    skip,
    limit
  }: FindDocumentsParams): Promise<Document[]> {
    const collection = await this._getCollection(collectionName);

    const mongoQuery = buildMongoQuery(expressions);
    const mongoSort = buildMongoSort(sort);

    const options = {projection};

    const documents: Document[] = await debugCall(
      async () => {
        const cursor = collection.find(mongoQuery, options);

        if (mongoSort !== undefined) {
          cursor.sort(mongoSort);
        }

        if (skip !== undefined) {
          cursor.skip(skip);
        }

        if (limit !== undefined) {
          cursor.limit(limit);
        }

        const documents = await cursor.toArray();

        return documents;
      },
      'db.%s.find(%o, %o)',
      collectionName,
      mongoQuery,
      options
    );

    return documents;
  }

  async countDocuments({collectionName, expressions}: CountDocumentsParams) {
    const collection = await this._getCollection(collectionName);

    const query = buildMongoQuery(expressions);

    const documentsCount = await debugCall(
      async () => {
        const documentsCount = await collection.countDocuments(query);

        return documentsCount;
      },
      'db.%s.countDocuments(%o)',
      collectionName,
      query
    );

    return documentsCount;
  }

  // === Serialization ===

  toDocument<Value>(storable: typeof StorableLike | StorableLike, value: Value) {
    let document = super.toDocument(storable, value);

    if (typeof document === 'object') {
      const primaryIdentifierAttributeName = ensureComponentInstance(storable)
        .getPrimaryIdentifierAttribute()
        .getName();

      document = mapKeys(document as any, (_, name) =>
        name === primaryIdentifierAttributeName ? MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME : name
      ) as Value;
    }

    return document;
  }

  fromDocument(storable: typeof StorableLike | StorableLike, document: Document): Document {
    let serializedStorable = super.fromDocument(storable, document);

    if (typeof serializedStorable === 'object') {
      const primaryIdentifierAttributeName = ensureComponentInstance(storable)
        .getPrimaryIdentifierAttribute()
        .getName();

      serializedStorable = mapKeys(serializedStorable, (_, name) =>
        name === MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME ? primaryIdentifierAttributeName : name
      );
    }

    return serializedStorable;
  }

  // === MongoDB client ===

  private _client: MongoClient | undefined;

  private async _getClient() {
    await this._connectClient();

    return this._client!;
  }

  private async _connectClient() {
    if (this._client === undefined) {
      debug(`Connecting to MongoDB Server (connectionString: ${this._connectionString})...`);

      this._client = await MongoClient.connect(this._connectionString, {
        poolSize: this._poolSize,
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      debug(`Connected to MongoDB Server (connectionString: ${this._connectionString})`);
    }
  }

  private async _disconnectClient() {
    const client = this._client;

    if (client !== undefined) {
      // Unset `this._client` and `this._db` early to avoid issue in case of concurrent execution
      this._client = undefined;
      this._db = undefined;

      debug(`Disconnecting from MongoDB Server (connectionString: ${this._connectionString})...`);

      await client.close();

      debug(`Disconnected from MongoDB Server (connectionString: ${this._connectionString})`);
    }
  }

  private _db: Db | undefined;

  private async _getDatabase() {
    if (!this._db) {
      const client = await this._getClient();
      this._db = client.db();
    }

    return this._db;
  }

  private _collections: {[name: string]: Collection} | undefined;

  private async _getCollection(name: string) {
    if (this._collections === undefined) {
      this._collections = Object.create(null);
    }

    if (this._collections![name] === undefined) {
      const database = await this._getDatabase();
      this._collections![name] = database.collection(name);
    }

    return this._collections![name];
  }
}

function buildMongoQuery(expressions: Expression[]) {
  const query: Query = {};

  for (const [path, operator, value] of expressions) {
    let subquery: Query;

    if (path !== '') {
      subquery = query[path];

      if (subquery === undefined) {
        subquery = {};
        query[path] = subquery;
      }
    } else {
      subquery = query;
    }

    const [actualOperator, actualValue] = handleOperator(operator, value, {path});

    subquery[actualOperator] = actualValue;
  }

  return query;
}

function handleOperator(
  operator: Operator,
  value: Operand,
  {path}: {path: Path}
): [Operator, unknown] {
  // --- Basic operators ---

  if (operator === '$equal') {
    return ['$eq', value];
  }

  if (operator === '$notEqual') {
    return ['$ne', value];
  }

  if (operator === '$greaterThan') {
    return ['$gt', value];
  }

  if (operator === '$greaterThanOrEqual') {
    return ['$gte', value];
  }

  if (operator === '$lessThan') {
    return ['$lt', value];
  }

  if (operator === '$lessThanOrEqual') {
    return ['$lte', value];
  }

  if (operator === '$in') {
    return ['$in', value];
  }

  // --- String operators ---

  if (operator === '$includes') {
    return ['$regex', escapeRegExp(value as string)];
  }

  if (operator === '$startsWith') {
    return ['$regex', `^${escapeRegExp(value as string)}`];
  }

  if (operator === '$endsWith') {
    return ['$regex', `${escapeRegExp(value as string)}$`];
  }

  if (operator === '$matches') {
    return ['$regex', value];
  }

  // --- Array operators ---

  if (operator === '$some') {
    const subexpressions = value as Expression[];
    const subquery = buildMongoQuery(subexpressions);
    return ['$elemMatch', subquery];
  }

  if (operator === '$every') {
    // TODO: Make it works for complex queries (regexps, array of objects, etc.)
    const subexpressions = value as Expression[];
    const subquery = buildMongoQuery(subexpressions);
    return ['$not', {$elemMatch: {$not: subquery}}];
  }

  if (operator === '$length') {
    return ['$size', value];
  }

  // --- Logical operators ---

  if (operator === '$not') {
    const subexpressions = value as Expression[];
    const subquery = buildMongoQuery(subexpressions);
    return ['$not', subquery];
  }

  if (operator === '$and') {
    const andSubexpressions = value as Expression[][];
    const andSubqueries = andSubexpressions.map((subexpressions) =>
      buildMongoQuery(subexpressions)
    );
    return ['$and', andSubqueries];
  }

  if (operator === '$or') {
    const orSubexpressions = value as Expression[][];
    const orSubqueries = orSubexpressions.map((subexpressions) => buildMongoQuery(subexpressions));
    return ['$or', orSubqueries];
  }

  if (operator === '$nor') {
    const norSubexpressions = value as Expression[][];
    const norSubqueries = norSubexpressions.map((subexpressions) =>
      buildMongoQuery(subexpressions)
    );
    return ['$nor', norSubqueries];
  }

  throw new Error(
    `A query contains an operator that is not supported (operator: '${operator}', path: '${path}')`
  );
}

function buildMongoSort(sort: SortDescriptor | undefined) {
  if (sort === undefined || isEmpty(sort)) {
    return undefined;
  }

  return mapValues(sort, (direction: SortDirection) =>
    direction.toLowerCase() === 'desc' ? -1 : 1
  );
}

async function debugCall<Result>(
  func: () => Promise<Result>,
  message: string,
  ...params: unknown[]
): Promise<Result> {
  let result;
  let error;

  try {
    result = await func();
  } catch (err) {
    error = err;
  }

  if (error !== undefined) {
    debug(`${message} => Error`, ...params);

    throw error;
  }

  debug(`${message} => %o`, ...params, result);

  return result as Result;
}

const findOneBatcher = Symbol('batcher');

interface FindOneOperation extends Operation {
  params: [filter: FilterQuery<any>, options: FindOneOptions<any>];
}

function batchableFindOne(
  collection: Collection & {[findOneBatcher]?: Microbatcher<FindOneOperation>},
  query: FilterQuery<any>,
  options: FindOneOptions<any>
) {
  assertIsObjectLike(query);

  if (collection[findOneBatcher] === undefined) {
    collection[findOneBatcher] = new Microbatcher(function (operations) {
      const operationGroups = groupBy(operations, ({params: [query, options]}) => {
        if (hasOwnProperty(query, '_id') && Object.keys(query).length === 1) {
          // 'query' has a single '_id' attribute
          query = {_id: '___???___'};
        }

        return JSON.stringify([query, options]);
      });

      for (const operations of Object.values(operationGroups)) {
        if (operations.length > 1) {
          // Multiple `findOne()` that can be transformed into a single `find()`

          const ids = operations.map((operation) => operation.params[0]._id);
          const options = operations[0].params[1]; // All 'options' objects should be identical

          collection
            .find({_id: {$in: ids}}, options)
            .toArray()
            .then(
              (documents) => {
                for (const {
                  params: [query],
                  resolve
                } of operations) {
                  const document = documents.find((document) => document._id === query._id);
                  resolve(document !== undefined ? document : null);
                }
              },
              (error) => {
                for (const {reject} of operations) {
                  reject(error);
                }
              }
            );
        } else {
          // Single `findOne()`

          const {
            params: [query, options],
            resolve,
            reject
          } = operations[0];

          collection.findOne(query, options).then(resolve, reject);
        }
      }
    });
  }

  return collection[findOneBatcher]!.batch(query, options);
}
