import {Model, field} from '@superstore/model';
import cuid from 'cuid';

export class Document extends Model {
  @field('string', {serializedName: '_id'}) id = this.constructor.generateId();

  static async get(id, {throwIfNotFound = true} = {}) {
    validateId(id);
    const store = this._getStore();

    const serializedDocument = await store.get({_type: this.getName(), _id: id});
    if (!serializedDocument) {
      if (throwIfNotFound) {
        throw new Error(`Document not found (model: '${this.getName()}', id: '${id}')`);
      }
      return undefined;
    }

    const document = this.deserialize(serializedDocument);
    document._isPersisted = true;

    await document.afterLoad();

    return document;
  }

  async afterLoad() {
    // NOOP
  }

  async save() {
    const store = this.constructor._getStore();

    await this.beforeSave();

    const options = this._isPersisted ?
      {
        excludeUnchangedFields: true,
        includeFields: ['id'],
        includeUndefinedFields: true
      } :
      undefined;
    const serializedDocument = this.serialize(options);

    await store.set(serializedDocument);
    this.commit();
    this._isPersisted = true;

    await this.afterSave();
  }

  async beforeSave() {
    // NOOP
  }

  async afterSave() {
    // NOOP
  }

  async delete() {
    const store = this.constructor._getStore();

    await this.beforeDelete();

    if (!this._isPersisted) {
      throw new Error(
        `Cannot delete a non-persisted document (model: '${this.constructor.getName()}', id: '${
          this.id
        }')`
      );
    }

    await store.delete({_type: this.constructor.getName(), _id: this.id});
    this._isPersisted = false;

    await this.afterDelete();
  }

  async beforeDelete() {
    // NOOP
  }

  async afterDelete() {
    // NOOP
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
