import {
  getFromOneOrMany,
  callWithOneOrMany,
  callWithOneOrManyAsync,
  mapFromOneOrMany
} from '@storable/util';

import {Document} from './document';

export class LocalDocument extends Document {
  static async get(id, {return: returnFields, throwIfNotFound = true} = {}) {
    callWithOneOrMany(id, id => {
      this.validateId(id);
    });

    const store = this._getStore();
    let serializedDocument = mapFromOneOrMany(id, id => ({_type: this.getName(), _id: id}));
    serializedDocument = await store.get(serializedDocument, {
      return: returnFields // TODO: Take into account the 'serializedName' field option
    });

    callWithOneOrMany(serializedDocument, (serializedDocument, index) => {
      if (!serializedDocument && throwIfNotFound) {
        throw new Error(
          `Document not found (model: '${this.getName()}', id: '${getFromOneOrMany(id, index)}')`
        );
      }
    });

    const document = mapFromOneOrMany(serializedDocument, serializedDocument =>
      serializedDocument ? this.deserialize(serializedDocument) : undefined
    );

    await callWithOneOrManyAsync(document, async document => {
      if (document) {
        await document.afterLoad();
      }
    });

    return document;
  }

  async save() {
    await this.beforeSave();

    const store = this.constructor._getStore();
    // TODO: Save only the changed fields
    // const serializedDocument = this.serialize({
    //   filter: (model, field) => {
    //     return model.fieldIsChanged(field);
    //   }
    // });
    const serializedDocument = this.serialize();
    await store.set(serializedDocument);
    this.commit();

    await this.afterSave();
  }

  async delete() {
    await this.beforeDelete();

    const store = this.constructor._getStore();
    const serializedDocument = this._serializeTypeAndId();
    await store.delete(serializedDocument);

    await this.afterDelete();
  }

  static async find({filter, sort, skip, limit, return: returnFields} = {}) {
    const store = this._getStore();

    const serializedDocuments = await store.find(
      {...this._serializeType(), ...filter},
      {
        sort,
        skip,
        limit,
        return: returnFields // TODO: Take into account the 'serializedName' field option
      }
    );

    const documents = serializedDocuments.map(serializedDocument =>
      this.deserialize(serializedDocument)
    );

    for (const document of documents) {
      await document.afterLoad();
    }

    return documents;
  }

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
