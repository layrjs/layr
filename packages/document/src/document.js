import {Model, field} from '@storable/model';
import {callWithOneOrMany} from '@storable/util';
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
      filter: (model, field) => field.name === 'id' || model.fieldIsChanged(field)
    });
    await store.set(serializedDocument);
    this.commit();

    await this.afterSave();
  }

  async beforeSave() {
    await this.forEachSubdocument(async document => await document.beforeSave());
  }

  async afterSave() {
    this.markAsNotNew();
    await this.forEachSubdocument(async document => await document.afterSave());
  }

  async delete() {
    await this.beforeDelete();

    const serializedDocument = this.serialize({
      filter: (_model, field) => field.name === 'id' || field.isOwned
    });
    const store = this.constructor._getStore();
    await store.delete(serializedDocument);

    await this.afterDelete();
  }

  async beforeDelete() {
    await this.forEachSubdocument(async document => await document.beforeDelete(), {
      limitToOwned: true
    });
  }

  async afterDelete() {
    await this.forEachSubdocument(async document => await document.afterDelete(), {
      limitToOwned: true
    });
  }

  async forEachSubdocument(func, {limitToOwned} = {}) {
    const documents = [];
    this.constructor.forEachField(field => {
      if (limitToOwned && !field.isOwned) {
        return;
      }
      const value = this[field.name];
      if (value !== undefined) {
        callWithOneOrMany(value, value => {
          if (value?.isOfType && value.isOfType('Document')) {
            documents.push(value);
          }
        });
      }
    });

    for (const document of documents) {
      await func(document);
    }
  }

  static generateId() {
    return cuid();
  }

  isOfType(name) {
    return name === 'Document' ? true : super.isOfType(name); // Optimization
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
