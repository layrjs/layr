import {AbstractStore} from '@liaison/abstract-store';
import {AttributeSelector} from '@liaison/component';
import {MongoClient} from 'mongodb';
import isEmpty from 'lodash/isEmpty';
import mapKeys from 'lodash/mapKeys';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('liaison:mongodb-store');
// To display the debug log, set this environment:
// DEBUG=liaison:mongodb-store DEBUG_DEPTH=10

const MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME = '_id';

export class MongoDBStore extends AbstractStore {
  constructor(connectionString, storables) {
    ow(connectionString, ow.string.url);

    super(storables);

    this._connectionString = connectionString;
  }

  async connect() {
    await this._connectClient();
  }

  async disconnect() {
    await this._disconnectClient();
  }

  async _loadFromCollection({collectionName, identifierDescriptor, attributeSelector}) {
    const collection = await this._getCollection(collectionName);

    const query = identifierDescriptor;
    const projection = buildProjection(attributeSelector);
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

  async _saveToCollection({collectionName, identifierDescriptor, document, isNew}) {
    const collection = await this._getCollection(collectionName);

    if (isNew) {
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

    const filter = identifierDescriptor;
    const update = {$set: document};

    const {matchedCount} = await debugCall(
      async () => {
        const {matchedCount, modifiedCount} = await collection.updateOne(filter, update);

        return {matchedCount, modifiedCount};
      },
      'db.%s.updateOne(%o, %o)',
      collectionName,
      filter,
      update
    );

    return matchedCount === 1;
  }

  async _deleteFromCollection({collectionName, identifierDescriptor}) {
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

  async _findInCollection({collectionName, query, sort, skip, limit, attributeSelector}) {
    const collection = await this._getCollection(collectionName);

    const projection = buildProjection(attributeSelector);
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

  // === Serialization ===

  _toDocument(storable, serializedStorable) {
    let document = super._toDocument(storable, serializedStorable);

    if (typeof document === 'object') {
      const primaryIdentifierAttributeName = storable.getPrimaryIdentifierAttribute().getName();

      document = mapKeys(document, (_, name) =>
        name === primaryIdentifierAttributeName ? MONGODB_PRIMARY_IDENTIFIER_ATTRIBUTE_NAME : name
      );
    }

    return document;
  }

  _fromDocument(storable, document) {
    let serializedStorable = super._fromDocument(storable, document);

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

// {a: true, b: {c: true}} => {__component: 1, a: 1, "b.__component": 1, "b.c": 1}
function buildProjection(attributeSelector) {
  if (attributeSelector === true) {
    return undefined;
  }

  if (attributeSelector === false) {
    return {};
  }

  const projection = {};

  function build(attributeSelector, path) {
    // Always include the '__component' attribute
    attributeSelector = {__component: true, ...attributeSelector};

    for (const [name, subattributeSelector] of AttributeSelector.entries(attributeSelector)) {
      const subpath = (path !== '' ? path + '.' : '') + name;

      if (subattributeSelector === true) {
        projection[subpath] = 1;
      } else if (subattributeSelector === false) {
        // NOOP
      } else {
        build(subattributeSelector, subpath);
      }
    }
  }

  build(attributeSelector, '');

  return projection;
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
