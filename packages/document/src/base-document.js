import {inspect} from 'util';
import {Model} from '@storable/model';
import {callWithOneOrMany} from '@storable/util';
import cuid from 'cuid';

export class BaseDocument extends Model {
  constructor(object, options) {
    super(object, options);

    if (options?.isDeserializing) {
      this._id = object?._id;
    } else {
      this._id = this.constructor.generateId();
    }
  }

  serialize(options) {
    const {_type, ...fields} = super.serialize(options);
    return {_type, _id: this._id, ...fields};
  }

  [inspect.custom]() {
    return {id: this._id, ...super[inspect.custom]()};
  }

  get id() {
    return this._id;
  }

  static generateId() {
    return cuid();
  }

  static validateId(id) {
    if (typeof id !== 'string') {
      throw new Error(`'id' must be a string (provided: ${typeof id})`);
    }
    if (id === '') {
      throw new Error(`'id' cannot be empty`);
    }
  }

  async afterLoad() {
    await this.forEachSubdocument(async document => await document.afterLoad());
  }

  async beforeSave() {
    await this.forEachSubdocument(async document => await document.beforeSave());
  }

  async afterSave() {
    this.markAsNotNew();
    await this.forEachSubdocument(async document => await document.afterSave());
  }

  async beforeDelete() {
    await this.forEachSubdocument(async document => await document.beforeDelete());
  }

  async afterDelete() {
    await this.forEachSubdocument(async document => await document.afterDelete());
  }

  async forEachSubdocument(func) {
    const subdocuments = [];
    this.constructor.forEachField(field => {
      const value = this[field.name];
      if (value !== undefined) {
        callWithOneOrMany(value, value => {
          if (value?.isOfType && value.isOfType('Subdocument')) {
            subdocuments.push(value);
          }
        });
      }
    });

    for (const subdocument of subdocuments) {
      await func(subdocument);
    }
  }
}
