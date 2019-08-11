import {Registerable} from '@layr/layer';
import nanoid from 'nanoid';
import {MongoClient} from 'mongodb';
import groupBy from 'lodash/groupBy';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('layr:mongodb-store');
// To display the debug log, set this environment:
// DEBUG=layr:mongodb-store DEBUG_DEPTH=10

export class MongoDBStore extends Registerable() {
  constructor(connectionString) {
    ow(connectionString, ow.string.url);

    super();
    this._connectionString = connectionString;
    this._id = nanoid();
  }

  getId() {
    return this._id;
  }

  async connect() {
    await this._connectClient();
  }

  async disconnect() {
    await this._disconnectClient();
  }

  async run(func, {transactional = false} = {}) {
    ow(func, ow.function);
    ow(transactional, ow.boolean);

    // TODO: Implement 'transactional'

    try {
      if (this._runCount === undefined) {
        this._runCount = 0;
      }
      this._runCount++;
      return await func();
    } finally {
      this._runCount--;
      if (this._runCount === 0) {
        await this._disconnectClient();
      }
    }
  }

  async load(documents, {fields, throwIfNotFound = true} = {}) {
    ow(documents, ow.array);
    ow(fields, ow.optional.object);
    ow(throwIfNotFound, ow.boolean);

    const loadedDocuments = await this._loadDocuments(documents, {fields});

    return documents.map(({_type, _id}) => {
      const loadedDocument = loadedDocuments.find(
        loadedDocument => loadedDocument._type === _type && loadedDocument._id === _id
      );
      if (loadedDocument) {
        return loadedDocument;
      }
      if (!throwIfNotFound) {
        return {_type, _id, _missed: true};
      }
      throw new Error(`Document not found (type: '${_type}', id: '${_id}')`);
    });
  }

  async _loadDocuments(documents, {fields} = {}) {
    const loadedDocuments = [];

    let projection;
    if (fields !== undefined) {
      projection = buildProjection(fields);
    }

    const documentsByType = groupBy(documents, '_type');
    for (const [type, documents] of Object.entries(documentsByType)) {
      const collection = await this._getCollection(type);
      const ids = documents.map(document => document._id);
      const query = {_id: {$in: ids}};
      const options = {projection};
      debug(`%s.find(%o, %o)`, type, query, options);
      const cursor = collection.find(query, options);
      const foundDocuments = await cursor.toArray();
      loadedDocuments.push(...foundDocuments);
    }

    return loadedDocuments;
  }

  async save(documents, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
    ow(documents, ow.array);
    ow(throwIfNotFound, ow.boolean);
    ow(throwIfAlreadyExists, ow.boolean);

    const existingDocuments = await this._loadDocuments(documents);

    const {updatedDocuments, acknowledgedDocuments} = this._updateDocuments(
      existingDocuments,
      documents,
      {
        throwIfNotFound,
        throwIfAlreadyExists
      }
    );

    const updatedDocumentsByType = groupBy(updatedDocuments, '_type');
    for (const [type, documents] of Object.entries(updatedDocumentsByType)) {
      const collection = await this._getCollection(type);
      const operations = documents.map(document => ({
        replaceOne: {filter: {_id: document._id}, replacement: document, upsert: true}
      }));
      const options = {ordered: false};
      debug(`%s.bulkWrite(%o, %o)`, type, operations, options);
      await collection.bulkWrite(operations, options);
    }

    return acknowledgedDocuments;
  }

  _updateDocuments(existingDocuments, documents, {throwIfNotFound, throwIfAlreadyExists}) {
    const updatedDocuments = [];
    const acknowledgedDocuments = [];

    for (const {_type, _new, _id, ...fields} of documents) {
      const acknowledgedDocument = {_type, _id, ...fields}; // Everything but '_new'

      let existingDocument = existingDocuments?.find(
        existingDocument => existingDocument._type === _type && existingDocument._id === _id
      );

      if (existingDocument) {
        if (_new) {
          if (throwIfAlreadyExists) {
            throw new Error(`Document already exists (type: '${_type}', id: '${_id}')`);
          }
          acknowledgedDocument._existed = true;
        }
      } else {
        if (!_new) {
          if (throwIfNotFound) {
            throw new Error(`Document not found (type: '${_type}', id: '${_id}')`);
          }
          acknowledgedDocument._missed = true;
        }
        existingDocument = {_type, _id};
      }

      const updatedDocument = this._updateDocument(existingDocument, fields, {
        throwIfNotFound,
        throwIfAlreadyExists
      });

      updatedDocuments.push(updatedDocument);
      acknowledgedDocuments.push(acknowledgedDocument);
    }

    return {updatedDocuments, acknowledgedDocuments};
  }

  _updateDocument(existingDocument, fields, {throwIfNotFound, throwIfAlreadyExists}) {
    const updatedDocument = {...existingDocument};

    for (let [name, value] of Object.entries(fields)) {
      value = deserializeValue(value);
      const existingValue = updatedDocument[name];
      let updatedValue;

      if (Array.isArray(value)) {
        updatedValue = this._updateDocuments(existingValue, value, {
          throwIfNotFound,
          throwIfAlreadyExists
        });
      } else if (typeof value === 'object') {
        updatedValue = this._updateDocument(existingValue, value, {
          throwIfNotFound,
          throwIfAlreadyExists
        });
      } else {
        updatedValue = value;
      }

      if (updatedValue !== undefined) {
        updatedDocument[name] = updatedValue;
      } else {
        delete updatedDocument[name];
      }
    }

    return updatedDocument;
  }

  async delete(documents, {throwIfNotFound = true} = {}) {
    ow(documents, ow.array);
    ow(throwIfNotFound, ow.boolean);

    const existingDocuments = await this._loadDocuments(documents, {fields: {}});

    const acknowledgedDocuments = documents.map(({_type, _id}) => {
      const acknowledgedDocument = {_type, _id};
      const existingDocument = existingDocuments.find(
        existingDocument => existingDocument._type === _type && existingDocument._id === _id
      );
      if (!existingDocument) {
        if (throwIfNotFound) {
          throw new Error(`Document not found (type: '${_type}', id: '${_id}')`);
        }
        acknowledgedDocument._missed = true;
      }
      return acknowledgedDocument;
    });

    const existingDocumentsByType = groupBy(existingDocuments, '_type');
    for (const [type, documents] of Object.entries(existingDocumentsByType)) {
      const collection = await this._getCollection(type);
      const ids = documents.map(document => document._id);
      const filter = {_id: {$in: ids}};
      debug(`%s.deleteMany(%o)`, type, filter);
      await collection.deleteMany(filter);
    }

    return acknowledgedDocuments;
  }

  // === Database ===

  async _getClient() {
    await this._connectClient();
    return this._client;
  }

  async _connectClient() {
    if (!this._client) {
      debug(`Connecting to MongoDB Server (connectionString: ${this._connectionString})...`);
      this._client = await MongoClient.connect(
        this._connectionString,
        {useNewUrlParser: true}
      );
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

  async _getCollection(type) {
    ow(type, ow.string.nonEmpty);

    const database = await this._getDatabase();
    return database.collection(type);
  }
}

// TODO: We should probably not have to handle serialization at this level
function deserializeValue(value) {
  if (value === null) {
    return undefined;
  }

  if (typeof value === 'object' && value._type === 'Date') {
    return new Date(value._value);
  }

  return value;
}

// {a: true, b: {c: true}} => {_type: 1, _id: 1, a: 1, "b._type": 1, "b._id": 1, "b.c": 1}
function buildProjection(fields) {
  ow(fields, ow.object);

  const projection = {};

  function build(rootFields, rootPath) {
    // Always include '_type' and '_id'
    rootFields = {_type: true, _id: true, ...rootFields};

    for (const [name, fields] of Object.entries(rootFields)) {
      const path = [...rootPath, name];
      if (typeof fields === 'object') {
        build(fields, path);
      } else if (fields) {
        projection[path.join('.')] = 1;
      }
    }
  }

  build(fields, []);

  return projection;
}
