import {Document} from './document';

export class LocalDocument extends Document {
  static async _load(documents, {fields, throwIfNotFound}) {
    const store = this._getStore();
    let serializedDocuments = documents.map(document => document._serializeTypeAndId());
    serializedDocuments = await store.get(serializedDocuments, {fields, throwIfNotFound});
    documents = serializedDocuments.map(
      serializedDocument => serializedDocument && this.deserialize(serializedDocument, {fields})
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
      serializedDocument => serializedDocument && this.deserialize(serializedDocument)
    );
    return documents;
  }

  static async _delete(documents, {throwIfNotFound}) {
    const store = this._getStore();
    let serializedDocuments = documents.map(document => document._serializeTypeAndId());
    serializedDocuments = await store.delete(serializedDocuments, {throwIfNotFound});
    documents = serializedDocuments.map(
      serializedDocument => serializedDocument && this.deserialize(serializedDocument)
    );
    return documents;
  }

  static async _find({filter, sort, skip, limit, fields}) {
    const store = this._getStore();
    const serializedDocuments = await store.find(
      {...this._serializeType(), ...filter},
      {sort, skip, limit, fields}
    );
    const documents = serializedDocuments.map(document => this.deserialize(document, {fields}));
    return documents;
  }

  // static async _loadReferencedDocuments(document, {return: fields}) {
  //   // const referencedDocuments = {
  //   //   Director: {
  //   //     abc123: {fullName: true}
  //   //   }
  //   // };
  //   const referencedDocuments = {};

  //   callWithOneOrMany(document, document => {
  //     document.forEachNestedEntity((referencedDocument, {fields}) => {

  //     }, {fields});
  //   });
  // }

  isOfType(name) {
    return name === 'LocalDocument' ? true : super.isOfType(name); // Optimization
  }

  static _getStore() {
    const registry = this._getRegistry();
    if (!registry.store) {
      throw new Error(`Store not found (model: ${this.name})`);
    }
    return registry.store;
  }
}
