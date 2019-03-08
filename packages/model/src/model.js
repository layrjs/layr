import {inspect} from 'util';

import {Field} from './field';

export class Model {
  constructor(object, {deserialize} = {}) {
    if (object !== undefined) {
      this._applyObject(object);
    }

    if (!deserialize) {
      this._applyDefaults();
    }
  }

  static deserialize(object) {
    return new this(object, {deserialize: true});
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  _applyObject(object) {
    for (const [name, value] of Object.entries(object)) {
      const field = this.constructor.getField(name);
      this._setFieldValue(field, value);
    }
  }

  _applyDefaults() {
    this.constructor.forEachField(field => {
      let value = field.default;
      if (value === undefined) {
        return;
      }
      if (this._getFieldValue(field) !== undefined) {
        return;
      }
      if (typeof value === 'function') {
        value = value.call(this);
      }
      if (value === undefined) {
        return;
      }
      this._setFieldValue(field, value);
    });
  }

  [inspect.custom]() {
    const object = {};
    this.constructor.forEachField(field => {
      const value = this._getFieldValue(field);
      if (value !== undefined) {
        object[field.name] = value;
      }
    });
    return object;
  }

  static defineField(name, type, options, descriptor) {
    if (descriptor.initializer) {
      options = {...options, default: descriptor.initializer};
    }

    const field = this.setField(name, type, options);

    descriptor.get = function () {
      return this._getFieldValue(field);
    };
    descriptor.set = function (val) {
      return this._setFieldValue(field, val);
    };

    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static getField(name) {
    const field = this._fields?.[name];
    if (!field) {
      throw new Error(`Field not found (name: '${name}')`);
    }
    return field;
  }

  static setField(name, type, options) {
    if (!Object.prototype.hasOwnProperty.call(this, '_fields')) {
      this._fields = {...this._fields};
    }
    let field = this._fields[name];
    if (field) {
      throw new Error(`Field already exists (name: '${name}')`);
    }
    field = new Field(name, type, options);
    this._fields[name] = field;
    return field;
  }

  static forEachField(func) {
    if (this._fields) {
      for (const field of Object.values(this._fields)) {
        func(field);
      }
    }
  }

  _getFieldValue(field) {
    return this._fieldValues?.[field.name];
  }

  _setFieldValue(field, value) {
    if (!Object.prototype.hasOwnProperty.call(this, '_fieldValues')) {
      this._fieldValues = Object.create(this._fieldValues || null);
    }
    this._fieldValues[field.name] = value;

    return value;
  }
}

export function field(type, options) {
  return function (target, name, descriptor) {
    target.constructor.defineField(name, type, options, descriptor);
  };
}
