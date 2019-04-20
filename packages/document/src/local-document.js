import {Document} from './document';

export class LocalDocument extends Document {
  static async _load(documents, {fields, throwIfNotFound}) {
    const store = this._getStore();
    documents = documents.map(document => document._serializeTypeAndId());
    documents = await store.get(documents, {fields, throwIfNotFound});
    return documents.map(document => document && this.deserialize(document, {fields}));
  }

  async _save() {
    const store = this.constructor._getStore();
    const serializedDocument = this.serialize({_isFinal: true});
    await store.set(serializedDocument);
  }

  async _delete() {
    const store = this.constructor._getStore();
    const serializedDocument = this._serializeTypeAndId();
    await store.delete(serializedDocument);
  }

  static async _find({filter, sort, skip, limit, fields}) {
    const store = this._getStore();
    let documents = await store.find(
      {...this._serializeType(), ...filter},
      {sort, skip, limit, fields}
    );
    documents = documents.map(document => this.deserialize(document, {fields}));
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
