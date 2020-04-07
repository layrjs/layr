import {AbstractStore} from '@liaison/abstract-store';
import {AttributeSelector} from '../../..';
import pull from 'lodash/pull';
import get from 'lodash/get';
import sortOn from 'sort-on';

export class MockStore extends AbstractStore {
  constructor(storables, options = {}) {
    const {initialCollections = {}, ...otherOptions} = options;

    super(storables, otherOptions);

    this._collections = initialCollections;
  }

  __getCollection(name) {
    let collection = this._collections[name];

    if (collection === undefined) {
      collection = [];
      this._collections[name] = collection;
    }

    return collection;
  }

  // === Documents ===

  async _createDocument({collectionName, identifierDescriptor, document}) {
    const collection = this.__getCollection(collectionName);

    const existingDocument = await this.__readDocument({collection, identifierDescriptor});

    if (existingDocument !== undefined) {
      return false;
    }

    collection.push(document);

    return true;
  }

  async _readDocument({collectionName, identifierDescriptor, attributeSelector}) {
    const collection = this.__getCollection(collectionName);

    let document = await this.__readDocument({collection, identifierDescriptor});

    if (document !== undefined) {
      document = AttributeSelector.pick(document, attributeSelector, {
        includeAttributeNames: ['__component']
      });
    }

    return document;
  }

  async __readDocument({collection, identifierDescriptor}) {
    const [[identifierName, identifierValue]] = Object.entries(identifierDescriptor);

    const document = collection.find(document => document[identifierName] === identifierValue);

    return document;
  }

  async _updateDocument({collectionName, identifierDescriptor, document}) {
    const collection = this.__getCollection(collectionName);

    const existingDocument = await this.__readDocument({collection, identifierDescriptor});

    if (existingDocument === undefined) {
      return false;
    }

    Object.assign(existingDocument, document);

    return true;
  }

  async _deleteDocument({collectionName, identifierDescriptor}) {
    const collection = this.__getCollection(collectionName);

    const document = await this.__readDocument({collection, identifierDescriptor});

    if (document === undefined) {
      return false;
    }

    pull(collection, document);

    return true;
  }

  async _findDocuments({collectionName, expressions, sort, skip, limit, attributeSelector}) {
    const collection = this.__getCollection(collectionName);

    let documents = await this.__findDocuments({collection, expressions, sort, skip, limit});

    documents = documents.map(document =>
      AttributeSelector.pick(document, attributeSelector, {
        includeAttributeNames: ['__component']
      })
    );

    return documents;
  }

  async __findDocuments({collection, expressions, sort, skip, limit}) {
    let documents = filterDocuments(collection, expressions);

    documents = sortDocuments(documents, sort);

    documents = skipDocuments(documents, skip);

    documents = limitDocuments(documents, limit);

    return documents;
  }

  async _countDocuments({collectionName, expressions}) {
    const collection = this.__getCollection(collectionName);

    const documents = await this.__findDocuments({collection, expressions});

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

function evaluateExpression(documentValue, operator, expressionValue, {path}) {
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
