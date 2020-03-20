import {AbstractStore} from '@liaison/abstract-store';
import mergeWith from 'lodash/mergeWith';

export class MockStore extends AbstractStore {
  constructor(storables, {initialCollections = {}} = {}) {
    super(storables);

    this._collections = initialCollections;
  }

  async _loadFromCollection({collectionName, identifierDescriptor}) {
    const documents = this._collections[collectionName];

    const [[identifierName, identifierValue]] = Object.entries(identifierDescriptor);

    const document = documents.find(document => document[identifierName] === identifierValue);

    return document;
  }

  async _saveToCollection({collectionName, identifierDescriptor, serializedStorable, isNew}) {
    const document = await this._loadFromCollection({collectionName, identifierDescriptor});

    if (isNew) {
      if (document !== undefined) {
        return undefined;
      }

      const documents = this._collections[collectionName];

      documents.push(serializedStorable);

      return serializedStorable;
    }

    if (document === undefined) {
      return undefined;
    }

    mergeWith(document, serializedStorable, function(_previousValue, newValue) {
      // Don't merge arrays
      if (Array.isArray(newValue)) {
        return newValue;
      }
    });

    return serializedStorable;
  }
}
