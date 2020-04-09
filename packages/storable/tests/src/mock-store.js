import {AbstractStore} from '@liaison/abstract-store';
import pull from 'lodash/pull';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import sortOn from 'sort-on';

export class MockStore extends AbstractStore {
  constructor(storables, options = {}) {
    const {initialCollections = {}, ...otherOptions} = options;

    super(storables, otherOptions);

    this._collections = initialCollections;
  }

  _getCollection(name) {
    let collection = this._collections[name];

    if (collection === undefined) {
      collection = [];
      this._collections[name] = collection;
    }

    return collection;
  }

  // === Documents ===

  async createDocument({collectionName, identifierDescriptor, document}) {
    const collection = this._getCollection(collectionName);

    const existingDocument = await this._readDocument({collection, identifierDescriptor});

    if (existingDocument !== undefined) {
      return false;
    }

    collection.push(document);

    return true;
  }

  async readDocument({collectionName, identifierDescriptor, projection: _}) {
    const collection = this._getCollection(collectionName);

    const document = await this._readDocument({collection, identifierDescriptor});

    return document;
  }

  async _readDocument({collection, identifierDescriptor}) {
    const [[identifierName, identifierValue]] = Object.entries(identifierDescriptor);

    const document = collection.find(document => document[identifierName] === identifierValue);

    return document;
  }

  async updateDocument({collectionName, identifierDescriptor, documentPatch}) {
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

  async deleteDocument({collectionName, identifierDescriptor}) {
    const collection = this._getCollection(collectionName);

    const document = await this._readDocument({collection, identifierDescriptor});

    if (document === undefined) {
      return false;
    }

    pull(collection, document);

    return true;
  }

  async findDocuments({collectionName, expressions, projection: _, sort, skip, limit}) {
    const collection = this._getCollection(collectionName);

    const documents = await this._findDocuments({collection, expressions, sort, skip, limit});

    return documents;
  }

  async _findDocuments({collection, expressions, sort, skip, limit}) {
    let documents = filterDocuments(collection, expressions);

    documents = sortDocuments(documents, sort);

    documents = skipDocuments(documents, skip);

    documents = limitDocuments(documents, limit);

    return documents;
  }

  async countDocuments({collectionName, expressions}) {
    const collection = this._getCollection(collectionName);

    const documents = await this._findDocuments({collection, expressions});

    return documents.length;
  }
}

function filterDocuments(documents, expressions) {
  if (expressions.length === 0) {
    return documents; // Optimization
  }

  return documents.filter(document => documentIsMatchingExpressions(document, expressions));
}

function documentIsMatchingExpressions(document, expressions) {
  for (const [path, operator, expressionValue] of expressions) {
    const documentValue = path !== '' ? get(document, path) : document;

    if (evaluateExpression(documentValue, operator, expressionValue, {path}) === false) {
      return false;
    }
  }

  return true;
}

// eslint-disable-next-line complexity
function evaluateExpression(documentValue, operator, expressionValue, {path}) {
  // --- Basic operators ---

  if (operator === '$equal') {
    return documentValue?.valueOf() === expressionValue?.valueOf();
  }

  if (operator === '$notEqual') {
    return documentValue?.valueOf() !== expressionValue?.valueOf();
  }

  if (operator === '$greaterThan') {
    return documentValue > expressionValue;
  }

  if (operator === '$greaterThanOrEqual') {
    return documentValue >= expressionValue;
  }

  if (operator === '$lessThan') {
    return documentValue < expressionValue;
  }

  if (operator === '$lessThanOrEqual') {
    return documentValue <= expressionValue;
  }

  if (operator === '$any') {
    return expressionValue.includes(documentValue);
  }

  // --- String operators ---

  if (operator === '$includes') {
    if (typeof documentValue !== 'string') {
      return false;
    }

    return documentValue.includes(expressionValue);
  }

  if (operator === '$startsWith') {
    if (typeof documentValue !== 'string') {
      return false;
    }

    return documentValue.startsWith(expressionValue);
  }

  if (operator === '$endsWith') {
    if (typeof documentValue !== 'string') {
      return false;
    }

    return documentValue.endsWith(expressionValue);
  }

  if (operator === '$matches') {
    if (typeof documentValue !== 'string') {
      return false;
    }

    return expressionValue.test(documentValue);
  }

  // --- Array operators ---

  if (operator === '$some') {
    if (!Array.isArray(documentValue)) {
      return false;
    }

    const subdocuments = documentValue;
    const subexpressions = expressionValue;

    return subdocuments.some(subdocument =>
      documentIsMatchingExpressions(subdocument, subexpressions)
    );
  }

  if (operator === '$every') {
    if (!Array.isArray(documentValue)) {
      return false;
    }

    const subdocuments = documentValue;
    const subexpressions = expressionValue;

    return subdocuments.every(subdocument =>
      documentIsMatchingExpressions(subdocument, subexpressions)
    );
  }

  if (operator === '$length') {
    if (!Array.isArray(documentValue)) {
      return false;
    }

    return documentValue.length === expressionValue;
  }

  // --- Logical operators ---

  if (operator === '$not') {
    const subexpressions = expressionValue;

    return !documentIsMatchingExpressions(documentValue, subexpressions);
  }

  if (operator === '$and') {
    const andSubexpressions = expressionValue;

    return andSubexpressions.every(subexpressions =>
      documentIsMatchingExpressions(documentValue, subexpressions)
    );
  }

  if (operator === '$or') {
    const orSubexpressions = expressionValue;

    return orSubexpressions.some(subexpressions =>
      documentIsMatchingExpressions(documentValue, subexpressions)
    );
  }

  if (operator === '$nor') {
    const norSubexpressions = expressionValue;

    return !norSubexpressions.some(subexpressions =>
      documentIsMatchingExpressions(documentValue, subexpressions)
    );
  }

  throw new Error(
    `A query contains an operator that is not supported (operator: '${operator}', path: '${path}')`
  );
}

function sortDocuments(documents, sort) {
  if (sort === undefined) {
    return documents;
  }

  const properties = Object.entries(sort).map(([name, direction]) => {
    let property = name;

    if (direction === -1) {
      property = `-${property}`;
    }

    return property;
  });

  return sortOn(documents, properties);
}

function skipDocuments(documents, skip) {
  if (skip === undefined) {
    return documents;
  }

  return documents.slice(skip);
}

function limitDocuments(documents, limit) {
  if (limit === undefined) {
    return documents;
  }

  return documents.slice(0, limit);
}
