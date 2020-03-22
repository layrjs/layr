import {AbstractStore} from '@liaison/abstract-store';
import {AttributeSelector} from '../../..';
import mergeWith from 'lodash/mergeWith';
import pull from 'lodash/pull';
import isEmpty from 'lodash/isEmpty';
import sortOn from 'sort-on';

export class MockStore extends AbstractStore {
  constructor(storables, {initialCollections = {}} = {}) {
    super(storables);

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

  async _loadFromCollection({collectionName, identifierDescriptor, attributeSelector}) {
    const collection = this.__getCollection(collectionName);

    let document = await this.__loadFromCollection({collection, identifierDescriptor});

    if (document !== undefined) {
      document = AttributeSelector.pick(document, attributeSelector, {
        includeAttributeNames: ['__component']
      });
    }

    return document;
  }

  async __loadFromCollection({collection, identifierDescriptor}) {
    const [[identifierName, identifierValue]] = Object.entries(identifierDescriptor);

    const document = collection.find(document => document[identifierName] === identifierValue);

    return document;
  }

  async _saveToCollection({collectionName, identifierDescriptor, document, isNew}) {
    const collection = this.__getCollection(collectionName);

    const existingDocument = await this.__loadFromCollection({collection, identifierDescriptor});

    if (isNew) {
      if (existingDocument !== undefined) {
        return false;
      }

      collection.push(document);

      return true;
    }

    if (existingDocument === undefined) {
      return false;
    }

    mergeWith(existingDocument, document, function(_previousValue, newValue) {
      // Don't merge arrays
      if (Array.isArray(newValue)) {
        return newValue;
      }
    });

    return true;
  }

  async _deleteFromCollection({collectionName, identifierDescriptor}) {
    const collection = this.__getCollection(collectionName);

    const document = await this.__loadFromCollection({collection, identifierDescriptor});

    if (document === undefined) {
      return false;
    }

    pull(collection, document);

    return true;
  }

  async _findInCollection({collectionName, query, sort, skip, limit, attributeSelector}) {
    const collection = this.__getCollection(collectionName);

    let documents = await this.__findInCollection({collection, query, sort, skip, limit});

    documents = documents.map(document =>
      AttributeSelector.pick(document, attributeSelector, {
        includeAttributeNames: ['__component']
      })
    );

    return documents;
  }

  async __findInCollection({collection, query, sort, skip, limit}) {
    let documents = findDocuments(collection, query);

    documents = sortDocuments(documents, sort);

    documents = skipDocuments(documents, skip);

    documents = limitDocuments(documents, limit);

    return documents;
  }
}

function findDocuments(documents, query) {
  if (isEmpty(query)) {
    return documents; // Optimization
  }

  return documents.filter(document => documentIsMatchingQuery(document, query));
}

function documentIsMatchingQuery(document, query) {
  for (const [name, valueInQuery] of Object.entries(query)) {
    const valueInDocument = document[name];

    if (valueInDocument !== valueInQuery) {
      return false;
    }
  }

  return true;
}

function sortDocuments(documents, sort) {
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
