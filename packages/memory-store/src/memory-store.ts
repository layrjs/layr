import {
  Store,
  CreateDocumentParams,
  ReadDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  FindDocumentsParams,
  CountDocumentsParams,
  MigrateCollectionParams,
  MigrateCollectionResult,
  Document,
  Expression,
  Path
} from '@layr/store';
import type {Operator, SortDescriptor} from '@layr/storable';
import type {NormalizedIdentifierDescriptor} from '@layr/component';
import pull from 'lodash/pull';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import sortOn from 'sort-on';

type Collection = Document[];

type CollectionMap = {[name: string]: Collection};

/**
 * *Inherits from [`Store`](https://layrjs.com/docs/v1/reference/store).*
 *
 * A [`Store`](https://layrjs.com/docs/v1/reference/store) that uses the memory to "persist" its registered [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class). Since the stored data is wiped off every time the execution environment is restarted, a `MemoryStore` shouldn't be used for a real application.
 *
 * #### Usage
 *
 * Create a `MemoryStore` instance, register some [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class) into it, and then use any [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class)'s method to load, save, delete, or find components from the store.
 *
 * See an example of use in the [`MongoDBStore`](https://layrjs.com/docs/v1/reference/mongodb-store) class.
 */
export class MemoryStore extends Store {
  /**
   * Creates a [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store).
   *
   * @param [options.initialCollections] A plain object specifying the initial data that should be populated into the store. The shape of the objet should be `{[collectionName]: documents}` where `collectionName` is the name of a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) class, and `documents` is an array of serialized storable component instances.
   *
   * @returns The [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store) instance that was created.
   *
   * @example
   * ```
   * // Create an empty memory store
   * const store = new MemoryStore();
   *
   * // Create a memory store with some initial data
   * const store = new MemoryStore({
   *   User: [
   *     {
   *       __component: 'User',
   *       id: 'xyz789',
   *       email: 'user@domain.com'
   *     }
   *   ],
   *   Movie: [
   *     {
   *       __component: 'Movie',
   *       id: 'abc123',
   *       title: 'Inception'
   *     }
   *   ]
   * });
   * ```
   *
   * @category Creation
   */
  constructor(options: {initialCollections?: CollectionMap} = {}) {
    const {initialCollections = {}, ...otherOptions} = options;

    super(otherOptions);

    this._collections = initialCollections;
  }

  // === Component Registration ===

  /**
   * See the methods that are inherited from the [`Store`](https://layrjs.com/docs/v1/reference/store#component-registration) class.
   *
   * @category Component Registration
   */

  // === Collections ===

  _collections: CollectionMap;

  _getCollection(name: string) {
    let collection = this._collections[name];

    if (collection === undefined) {
      collection = [];
      this._collections[name] = collection;
    }

    return collection;
  }

  // === Documents ===

  async createDocument({collectionName, identifierDescriptor, document}: CreateDocumentParams) {
    const collection = this._getCollection(collectionName);

    const existingDocument = await this._readDocument({collection, identifierDescriptor});

    if (existingDocument !== undefined) {
      return false;
    }

    collection.push(document);

    return true;
  }

  async readDocument({
    collectionName,
    identifierDescriptor
  }: ReadDocumentParams): Promise<Document | undefined> {
    const collection = this._getCollection(collectionName);

    const document = await this._readDocument({collection, identifierDescriptor});

    return document;
  }

  async _readDocument({
    collection,
    identifierDescriptor
  }: {
    collection: Collection;
    identifierDescriptor: NormalizedIdentifierDescriptor;
  }): Promise<Document | undefined> {
    const [[identifierName, identifierValue]] = Object.entries(identifierDescriptor);

    const document = collection.find((document) => document[identifierName] === identifierValue);

    return document;
  }

  async updateDocument({
    collectionName,
    identifierDescriptor,
    documentPatch
  }: UpdateDocumentParams) {
    const collection = this._getCollection(collectionName);

    const existingDocument = await this._readDocument({collection, identifierDescriptor});

    if (existingDocument === undefined) {
      return false;
    }

    const {$set, $unset} = documentPatch;

    if ($set !== undefined) {
      for (const [path, value] of Object.entries($set)) {
        set(existingDocument, path, value);
      }
    }

    if ($unset !== undefined) {
      for (const [path, value] of Object.entries($unset)) {
        if (value) {
          unset(existingDocument, path);
        }
      }
    }

    return true;
  }

  async deleteDocument({collectionName, identifierDescriptor}: DeleteDocumentParams) {
    const collection = this._getCollection(collectionName);

    const document = await this._readDocument({collection, identifierDescriptor});

    if (document === undefined) {
      return false;
    }

    pull(collection, document);

    return true;
  }

  async findDocuments({
    collectionName,
    expressions,
    sort,
    skip,
    limit
  }: FindDocumentsParams): Promise<Document[]> {
    const collection = this._getCollection(collectionName);

    const documents = await this._findDocuments({collection, expressions, sort, skip, limit});

    return documents;
  }

  async _findDocuments({
    collection,
    expressions,
    sort,
    skip,
    limit
  }: {
    collection: Collection;
    expressions: Expression[];
    sort?: SortDescriptor;
    skip?: number;
    limit?: number;
  }): Promise<Document[]> {
    let documents = filterDocuments(collection, expressions);

    documents = sortDocuments(documents, sort);

    documents = skipDocuments(documents, skip);

    documents = limitDocuments(documents, limit);

    return documents;
  }

  async countDocuments({collectionName, expressions}: CountDocumentsParams) {
    const collection = this._getCollection(collectionName);

    const documents = await this._findDocuments({collection, expressions});

    return documents.length;
  }

  // === Migration ===

  async migrateCollection({collectionName}: MigrateCollectionParams) {
    const result: MigrateCollectionResult = {
      name: collectionName,
      createdIndexes: [],
      droppedIndexes: []
    };

    return result;
  }
}

function filterDocuments(documents: Document[], expressions: Expression[]) {
  if (expressions.length === 0) {
    return documents; // Optimization
  }

  return documents.filter((document) => documentIsMatchingExpressions(document, expressions));
}

function documentIsMatchingExpressions(document: Document, expressions: Expression[]) {
  for (const [path, operator, operand] of expressions) {
    const attributeValue = path !== '' ? get(document, path) : document;

    if (evaluateExpression(attributeValue, operator, operand, {path}) === false) {
      return false;
    }
  }

  return true;
}

function evaluateExpression(
  attributeValue: any,
  operator: Operator,
  operand: any,
  {path}: {path: Path}
) {
  // --- Basic operators ---

  if (operator === '$equal') {
    return attributeValue?.valueOf() === operand?.valueOf();
  }

  if (operator === '$notEqual') {
    return attributeValue?.valueOf() !== operand?.valueOf();
  }

  if (operator === '$greaterThan') {
    return attributeValue > operand;
  }

  if (operator === '$greaterThanOrEqual') {
    return attributeValue >= operand;
  }

  if (operator === '$lessThan') {
    return attributeValue < operand;
  }

  if (operator === '$lessThanOrEqual') {
    return attributeValue <= operand;
  }

  if (operator === '$in') {
    return operand.includes(attributeValue);
  }

  // --- String operators ---

  if (operator === '$includes') {
    if (typeof attributeValue !== 'string') {
      return false;
    }

    return attributeValue.includes(operand);
  }

  if (operator === '$startsWith') {
    if (typeof attributeValue !== 'string') {
      return false;
    }

    return attributeValue.startsWith(operand);
  }

  if (operator === '$endsWith') {
    if (typeof attributeValue !== 'string') {
      return false;
    }

    return attributeValue.endsWith(operand);
  }

  if (operator === '$matches') {
    if (typeof attributeValue !== 'string') {
      return false;
    }

    return operand.test(attributeValue);
  }

  // --- Array operators ---

  if (operator === '$some') {
    if (!Array.isArray(attributeValue)) {
      return false;
    }

    const subdocuments = attributeValue;
    const subexpressions = operand;

    return subdocuments.some((subdocument) =>
      documentIsMatchingExpressions(subdocument, subexpressions)
    );
  }

  if (operator === '$every') {
    if (!Array.isArray(attributeValue)) {
      return false;
    }

    const subdocuments = attributeValue;
    const subexpressions = operand;

    return subdocuments.every((subdocument) =>
      documentIsMatchingExpressions(subdocument, subexpressions)
    );
  }

  if (operator === '$length') {
    if (!Array.isArray(attributeValue)) {
      return false;
    }

    return attributeValue.length === operand;
  }

  // --- Logical operators ---

  if (operator === '$not') {
    const subexpressions = operand;

    return !documentIsMatchingExpressions(attributeValue, subexpressions);
  }

  if (operator === '$and') {
    const andSubexpressions = operand as any[];

    return andSubexpressions.every((subexpressions) =>
      documentIsMatchingExpressions(attributeValue, subexpressions)
    );
  }

  if (operator === '$or') {
    const orSubexpressions = operand as any[];

    return orSubexpressions.some((subexpressions) =>
      documentIsMatchingExpressions(attributeValue, subexpressions)
    );
  }

  if (operator === '$nor') {
    const norSubexpressions = operand as any[];

    return !norSubexpressions.some((subexpressions) =>
      documentIsMatchingExpressions(attributeValue, subexpressions)
    );
  }

  throw new Error(
    `A query contains an operator that is not supported (operator: '${operator}', path: '${path}')`
  );
}

function sortDocuments(documents: Document[], sort: SortDescriptor | undefined) {
  if (sort === undefined) {
    return documents;
  }

  const properties = Object.entries(sort).map(([name, direction]) => {
    let property = name;

    if (direction.toLowerCase() === 'desc') {
      property = `-${property}`;
    }

    return property;
  });

  return sortOn(documents, properties);
}

function skipDocuments(documents: Document[], skip: number | undefined) {
  if (skip === undefined) {
    return documents;
  }

  return documents.slice(skip);
}

function limitDocuments(documents: Document[], limit: number | undefined) {
  if (limit === undefined) {
    return documents;
  }

  return documents.slice(0, limit);
}
