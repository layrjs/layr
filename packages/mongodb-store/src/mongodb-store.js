import {AbstractStore} from '@liaison/abstract-store';
import {MongoClient} from 'mongodb';
import isEmpty from 'lodash/isEmpty';
import mapKeys from 'lodash/mapKeys';
import escapeRegExp from 'lodash/escapeRegExp';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('liaison:mongodb-store');
// To display the debug log, set this environment:
// DEBUG=liaison:mongodb-store DEBUG_DEPTH=10

const MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME = '_id';

export class MongoDBStore extends AbstractStore {
  constructor(storables, options = {}) {
    ow(options, 'options', ow.object.partialShape({connectionString: ow.string.url}));

    const {connectionString, ...otherOptions} = options;

    super(storables, otherOptions);

    this._connectionString = connectionString;
  }

  async connect() {
    await this._connectClient();
  }

  async disconnect() {
    await this._disconnectClient();
  }

  // === Documents ===

  async createDocument({collectionName, document}) {
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

  async readDocument({collectionName, identifierDescriptor, projection}) {
    const collection = await this._getCollection(collectionName);

    const query = identifierDescriptor;
    const options = {projection};

    const document = await debugCall(
      async () => await collection.findOne(query, options),
      'db.%s.findOne(%o, %o)',
      collectionName,
      query,
      options
    );

    if (document === null) {
      return undefined;
    }

    return document;
  }

  async updateDocument({collectionName, identifierDescriptor, documentPatch}) {
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

  async deleteDocument({collectionName, identifierDescriptor}) {
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

  async findDocuments({collectionName, expressions, projection, sort, skip, limit}) {
    const collection = await this._getCollection(collectionName);

    const query = buildQuery(expressions);

    const options = {projection};

    const documents = await debugCall(
      async () => {
        const cursor = await collection.find(query, options);

        if (!isEmpty(sort)) {
          cursor.sort(sort);
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
      query,
      options
    );

    return documents;
  }

  async countDocuments({collectionName, expressions}) {
    const collection = await this._getCollection(collectionName);

    const query = buildQuery(expressions);

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

  toDocument(storable, serializedStorable) {
    let document = super.toDocument(storable, serializedStorable);

    if (typeof document === 'object') {
      const primaryIdentifierAttributeName = storable.getPrimaryIdentifierAttribute().getName();

      document = mapKeys(document, (_, name) =>
        name === primaryIdentifierAttributeName ? MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME : name
      );
    }

    return document;
  }

  fromDocument(storable, document) {
    let serializedStorable = super.fromDocument(storable, document);

    if (typeof serializedStorable === 'object') {
      const primaryIdentifierAttributeName = storable.getPrimaryIdentifierAttribute().getName();

      serializedStorable = mapKeys(serializedStorable, (_, name) =>
        name === MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME ? primaryIdentifierAttributeName : name
      );
    }

    return serializedStorable;
  }

  // === MongoDB client ===

  async _getClient() {
    await this._connectClient();

    return this._client;
  }

  async _connectClient() {
    if (!this._client) {
      debug(`Connecting to MongoDB Server (connectionString: ${this._connectionString})...`);

      this._client = await MongoClient.connect(this._connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      debug(`Connected to MongoDB Server (connectionString: ${this._connectionString})`);
    }
  }

  async _disconnectClient() {
    const client = this._client;

    if (client) {
      // Unset `this._client` early to avoid issue in case of concurrent execution
      this._client = undefined;

      debug(`Disconnecting from MongoDB Server (connectionString: ${this._connectionString})...`);

      await client.close();

      debug(`Disconnected from MongoDB Server (connectionString: ${this._connectionString})`);
    }
  }

  async _getDatabase() {
    if (!this._db) {
      const client = await this._getClient();
      this._db = client.db();
    }

    return this._db;
  }

  async _getCollection(name) {
    ow(name, ow.string.nonEmpty);

    const database = await this._getDatabase();

    return database.collection(name);
  }
}

function buildQuery(expressions) {
  const query = {};

  for (const [path, operator, value] of expressions) {
    let subquery;

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

function handleOperator(operator, value, {path}) {
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

  if (operator === '$any') {
    return ['$in', value];
  }

  // --- String operators ---

  if (operator === '$includes') {
    return ['$regex', escapeRegExp(value)];
  }

  if (operator === '$startsWith') {
    return ['$regex', `^${escapeRegExp(value)}`];
  }

  if (operator === '$endsWith') {
    return ['$regex', `${escapeRegExp(value)}$`];
  }

  if (operator === '$matches') {
    return ['$regex', value];
  }

  // --- Array operators ---

  if (operator === '$some') {
    const subexpressions = value;
    const subquery = buildQuery(subexpressions);
    return ['$elemMatch', subquery];
  }

  if (operator === '$every') {
    // TODO: Make it works for complex queries (regexps, array of objects, etc.)
    const subexpressions = value;
    const subquery = buildQuery(subexpressions);
    return ['$not', {$elemMatch: {$not: subquery}}];
  }

  if (operator === '$length') {
    return ['$size', value];
  }

  // --- Logical operators ---

  if (operator === '$not') {
    const subexpressions = value;
    const subquery = buildQuery(subexpressions);
    return ['$not', subquery];
  }

  if (operator === '$and') {
    const andSubexpressions = value;
    const andSubqueries = andSubexpressions.map(subexpressions => buildQuery(subexpressions));
    return ['$and', andSubqueries];
  }

  if (operator === '$or') {
    const orSubexpressions = value;
    const orSubqueries = orSubexpressions.map(subexpressions => buildQuery(subexpressions));
    return ['$or', orSubqueries];
  }

  if (operator === '$nor') {
    const norSubexpressions = value;
    const norSubqueries = norSubexpressions.map(subexpressions => buildQuery(subexpressions));
    return ['$nor', norSubqueries];
  }

  throw new Error(
    `A query contains an operator that is not supported (operator: '${operator}', path: '${path}')`
  );
}

async function debugCall(func, message, ...params) {
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

  return result;
}
