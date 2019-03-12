import {Model, field} from '@superstore/model';
import cuid from 'cuid';

export class Document extends Model {
  @field('string', {serializedName: '_id'}) id = this.constructor.generateId();

  static async get(id, {return: returnFields, throwIfNotFound = true} = {}) {
    validateId(id);

    const store = this._getStore();
    let options;
    if (returnFields !== undefined) {
      options = {return: returnFields}; // TODO: Take into account the 'serializedName' field option
    }
    const serializedDocument = await store.get({_type: this.getName(), _id: id}, options);
    if (!serializedDocument) {
      if (throwIfNotFound) {
        throw new Error(`Document not found (model: '${this.getName()}', id: '${id}')`);
      }
      return undefined;
    }

    const document = this.deserialize(serializedDocument);

    await document.afterLoad();

    return document;
  }

  async afterLoad() {
    await this.forEachSubdocument(async document => await document.afterLoad());
  }

  async save() {
    await this.beforeSave();

    const store = this.constructor._getStore();
    const serializedDocument = this.serialize({
      includeFields: ['id'],
      includeChangedFields: true,
      includeUndefinedFields: true
    });
    await store.set(serializedDocument);
    this.commit();

    await this.afterSave();
  }

  async beforeSave() {
    await this.forEachSubdocument(async document => await document.beforeSave());
  }

  async afterSave() {
    await this.forEachSubdocument(async document => await document.afterSave());
  }

  async delete({cascade} = {}) {
    await this.beforeDelete({cascade});

    const serializedDocument = this.serialize({
      includeFields: ['id'],
      includeFieldsOfType: cascade ? 'Document' : undefined
    });
    const store = this.constructor._getStore();
    await store.delete(serializedDocument);

    await this.afterDelete({cascade});
  }

  async beforeDelete({cascade}) {
    if (cascade) {
      await this.forEachSubdocument(async document => await document.beforeDelete({cascade}));
    }
  }

  async afterDelete({cascade}) {
    if (cascade) {
      await this.forEachSubdocument(async document => await document.afterDelete({cascade}));
    }
  }

  async forEachSubdocument(func) {
    const documents = [];
    this.constructor.forEachField(field => {
      const value = this[field.name];
      if (value?.isOfType && value.isOfType('Document')) {
        documents.push(value);
      }
    });

    for (const document of documents) {
      await func(document);
    }
  }

  static generateId() {
    return cuid();
  }

  static _getStore() {
    const registry = this._getRegistry();
    if (!registry.store) {
      throw new Error(`Store not found (model: ${this.name})`);
    }
    return registry.store;
  }
}

function validateId(id) {
  if (typeof id !== 'string') {
    throw new Error(`'id' must be a string (provided type: ${typeof id}`);
  }
  if (id === '') {
    throw new Error(`'id' cannot be empty`);
  }
}
