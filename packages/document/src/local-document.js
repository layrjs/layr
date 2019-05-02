import {AbstractDocument} from './abstract-document';

export class LocalDocument extends AbstractDocument {
  static store = 'store';

  static async _load(documents, {fields, throwIfNotFound}) {
    const store = this._getStore();
    let serializedDocuments = documents.map(document => document._serializeTypeAndId());
    serializedDocuments = await store.get(serializedDocuments, {fields, throwIfNotFound});
    documents = serializedDocuments.map(
      serializedDocument =>
        serializedDocument && this.deserialize(serializedDocument, {fields, source: 'store'})
    );
    return documents;
  }

  static async _save(documents, {throwIfNotFound, throwIfAlreadyExists}) {
    const store = this._getStore();
    let serializedDocuments = documents.map(document => document.serialize());
    serializedDocuments = await store.set(serializedDocuments, {
      throwIfNotFound,
      throwIfAlreadyExists
    });
    documents = serializedDocuments.map(
      serializedDocument =>
        serializedDocument && this.deserialize(serializedDocument, {source: 'store'})
    );
    return documents;
  }

  static async _delete(documents, {throwIfNotFound}) {
    const store = this._getStore();
    let serializedDocuments = documents.map(document => document._serializeTypeAndId());
    serializedDocuments = await store.delete(serializedDocuments, {throwIfNotFound});
    documents = serializedDocuments.map(
      serializedDocument =>
        serializedDocument && this.deserialize(serializedDocument, {source: 'store'})
    );
    return documents;
  }

  static async _find({filter, sort, skip, limit, fields}) {
    const store = this._getStore();
    const serializedDocuments = await store.find(
      {...this._serializeType(), ...filter},
      {sort, skip, limit, fields}
    );
    const documents = serializedDocuments.map(document =>
      this.deserialize(document, {fields, source: 'store'})
    );
    return documents;
  }

  isOfType(name) {
    return name === 'LocalDocument' ? true : super.isOfType(name); // Optimization
  }

  static _getStore() {
    const registry = this._getRegistry();
    const store = registry[this.store];
    if (!store) {
      throw new Error(`Store not found (model: ${this.name}, store: ${this.store})`);
    }
    return store;
  }
}
