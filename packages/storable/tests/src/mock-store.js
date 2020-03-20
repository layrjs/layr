import {AbstractStore} from '@liaison/abstract-store';
import mergeWith from 'lodash/mergeWith';
import pull from 'lodash/pull';

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

  async _loadFromCollection({collectionName, identifierDescriptor}) {
    const collection = this.__getCollection(collectionName);

    const document = await this.__loadFromCollection({collection, identifierDescriptor});

    return document;
  }

  async __loadFromCollection({collection, identifierDescriptor}) {
    const [[identifierName, identifierValue]] = Object.entries(identifierDescriptor);

    const document = collection.find(document => document[identifierName] === identifierValue);

    return document;
  }

  async _saveToCollection({collectionName, identifierDescriptor, serializedStorable, isNew}) {
    const collection = this.__getCollection(collectionName);

    const document = await this.__loadFromCollection({collection, identifierDescriptor});

    if (isNew) {
      if (document !== undefined) {
        return false;
      }

      collection.push(serializedStorable);

      return true;
    }

    if (document === undefined) {
      return false;
    }

    mergeWith(document, serializedStorable, function(_previousValue, newValue) {
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
}
