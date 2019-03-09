import {inspect} from 'util';

import {Field} from './field';

export class Model {
  constructor(object, options) {
    if (object !== undefined) {
      if (typeof object !== 'object') {
        throw new Error(
          `Type mismatch (model: '${
            this.constructor.name
          }', expected type: 'object', provided type: '${typeof object}')`
        );
      }

      if (object._type !== undefined) {
        const ObjectModel = this.constructor._getModel(object._type);
        object = new ObjectModel(object._value, options);
      }

      if (object instanceof Model) {
        if (!(object instanceof this.constructor)) {
          throw new Error(
            `Type mismatch (expected type: '${this.constructor.name}', provided type: '${
              object.constructor.name
            }')`
          );
        }
        return object;
      }

      for (const [name, value] of Object.entries(object)) {
        const field = this.constructor.getField(name);
        this._setFieldValue(field, value, options);
      }
    }

    if (!options?.deserialize) {
      this._applyDefaults(options);
    }
  }

  static deserialize(object) {
    return new this(object, {deserialize: true});
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  _applyDefaults(options) {
    this.constructor.forEachField(field => {
      let value = field.default;
      if (value === undefined) {
        return;
      }
      if (this._getFieldValue(field) !== undefined) {
        return;
      }
      while (typeof value === 'function') {
        value = value.call(this);
      }
      if (value === undefined) {
        return;
      }
      this._setFieldValue(field, value, options);
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

  _setFieldValue(field, value, options) {
    value = field.normalize(value, this, options);

    if (!Object.prototype.hasOwnProperty.call(this, '_fieldValues')) {
      this._fieldValues = Object.create(this._fieldValues || null);
    }
    this._fieldValues[field.name] = value;

    return value;
  }

  static _getModel(name) {
    const registry = this._getRegistry();
    const Model = registry[name];
    if (Model === undefined) {
      throw new Error(`Model not found (name: '${name}')`);
    }
    return Model;
  }

  static _getRegistry() {
    if (!this.$registry) {
      throw new Error(`Registry not found (model: ${this.name})`);
    }
    return this.$registry;
  }
}

export function field(type, options) {
  return function (target, name, descriptor) {
    target.constructor.defineField(name, type, options, descriptor);
  };
}
