import {inspect} from 'util';

import {Field} from './field';

export class Model {
  constructor(object, options) {
    if (object !== undefined) {
      if (typeof object !== 'object') {
        throw new Error(
          `Type mismatch (model: '${this.constructor.getName()}', expected type: 'object', provided type: '${typeof object}')`
        );
      }

      if (object._type !== undefined) {
        const {_type: type, ...value} = object;
        const ObjectModel = this.constructor._getModel(type);
        object = new ObjectModel(value, options);
      }

      if (object.isOfType && object.isOfType('Model')) {
        if (!object.isOfType(this.constructor.getName())) {
          throw new Error(
            `Type mismatch (expected type: '${this.constructor.getName()}', provided type: '${object.constructor.getName()}')`
          );
        }
        return object;
      }

      for (const [name, value] of Object.entries(object)) {
        const field = this.constructor.getField(name, {deserialize: options?.deserialize});
        if (field) {
          this._setFieldValue(field, value, options);
        } else {
          // Silently ignore undefined fields
        }
      }
    }

    if (!options?.deserialize) {
      this._applyDefaults(options);
    }
  }

  serialize({
    includeFields = true,
    includeChangedFields,
    includeUndefinedFields,
    includeFieldsOfType
  } = {}) {
    const result = {_type: this.constructor.getName()};
    this.constructor.forEachField(field => {
      let value = this._getFieldValue(field);
      if (
        includeFields === true ||
        (Array.isArray(includeFields) && includeFields.includes(field.name)) ||
        (includeChangedFields && this._fieldIsChanged(field)) ||
        (includeFieldsOfType && value.isOfType && value.isOfType(includeFieldsOfType))
      ) {
        value = field.serialize(value, {
          includeFields,
          includeChangedFields,
          includeUndefinedFields,
          includeFieldsOfType
        });
        if (value !== undefined) {
          result[field.serializedName || field.name] = value;
        }
      }
    });
    return result;
  }

  toJSON() {
    return this.serialize();
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
      this._saveFieldValue(field);
      return this._setFieldValue(field, val);
    };

    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static getField(name, options) {
    if (!options?.deserialize) {
      return this._fields?.[name];
    }

    return this.forEachField(field => {
      if (field.serializedName) {
        return field.serializedName === name ? field : undefined;
      }
      return field.name === name ? field : undefined;
    });
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
        const result = func(field);
        if (result !== undefined) {
          // Early return if the function returned something
          return result;
        }
      }
    }
  }

  _getFieldValue(field) {
    return this._fieldValues?.[field.name];
  }

  _setFieldValue(field, value, options) {
    value = field.deserialize(value, this, options);
    if (this._fieldValues === undefined) {
      this._fieldValues = {};
    }
    this._fieldValues[field.name] = value;
    return value;
  }

  _saveFieldValue(field) {
    if (this._savedFieldValues === undefined) {
      this._savedFieldValues = {};
    }
    this._savedFieldValues[field.name] = this._getFieldValue(field);
  }

  _fieldIsChanged(field) {
    return (
      this._savedFieldValues &&
      Object.prototype.hasOwnProperty.call(this._savedFieldValues, field.name)
    );
  }

  commit() {
    if (this.isChanged()) {
      this._savedFieldValues = undefined;
    }
  }

  rollback() {
    if (!this.isChanged()) {
      return;
    }
    for (const [name, value] of Object.entries(this._savedFieldValues)) {
      this._fieldValues[name] = value;
    }
    this._savedFieldValues = undefined;
  }

  isChanged() {
    return this._savedFieldValues !== undefined;
  }

  touch(name) {
    const field = this.constructor.getField(name);
    if (!field) {
      throw new Error(`Field not found (name: '${name}', model: '${this.constructor.getName()}')`);
    }
    this._saveFieldValue(field);
  }

  static getName() {
    return this.name;
  }

  isOfType(name) {
    let Model = this.constructor;
    while (Model) {
      if (Model.name === name) {
        return true;
      }
      Model = Object.getPrototypeOf(Model);
    }
    return false;
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
      throw new Error(`Registry not found (model: ${this.getName()})`);
    }
    return this.$registry;
  }
}

export function field(type, options) {
  return function (target, name, descriptor) {
    target.constructor.defineField(name, type, options, descriptor);
  };
}
