import {inspect} from 'util';
import {findFromOneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';

import {Field} from './field';

export class Model {
  constructor(object = {}, {isDeserializing} = {}) {
    if (typeof object !== 'object') {
      throw new Error(
        `Type mismatch (model: '${this.constructor.getName()}', expected: 'object', provided: '${typeof object}')`
      );
    }

    if (object._type !== undefined) {
      const {_type: type, ...value} = object;
      const ObjectModel = this.constructor._getModel(type);
      object = new ObjectModel(value, {isDeserializing});
    }

    if (object.isOfType && object.isOfType('Model')) {
      if (!object.isOfType(this.constructor.getName())) {
        throw new Error(
          `Type mismatch (expected: '${this.constructor.getName()}', provided: '${object.constructor.getName()}')`
        );
      }
      return object;
    }

    this._fieldValues = {};
    this._savedFieldValues = {};

    this.constructor.forEachField(field => {
      const name = isDeserializing ? field.serializedName : field.name;
      if (Object.prototype.hasOwnProperty.call(object, name)) {
        const value = object[name];
        this._setFieldValue(field, value, {isDeserializing});
      } else if (!isDeserializing) {
        if (field.default !== undefined) {
          this._applyFieldDefault(field);
        } else {
          this._initializeFieldValue(field);
        }
      }
    });
  }

  serialize({filter} = {}) {
    const result = {_type: this.constructor.getName()};
    this.constructor.forEachField(field => {
      if (!this._fieldHasBeenSet(field)) {
        return;
      }
      if (filter && !filter(this, field)) {
        return;
      }
      let value = this._getFieldValue(field);
      value = field.serializeValue(value, {filter});
      result[field.serializedName] = value;
    });
    return result;
  }

  toJSON() {
    return this.serialize();
  }

  static deserialize(object) {
    return new this(object, {isDeserializing: true});
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
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
    return this._fields?.[name];
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

  forEachSubmodel(func) {
    return this.constructor.forEachField(field => {
      const value = this._getFieldValue(field);
      return findFromOneOrMany(value, value => {
        if (value?.isOfType && value.isOfType('Model')) {
          return func(value) !== undefined;
        }
      });
    });
  }

  _initializeFieldValue(field) {
    if (field.isArray) {
      this._fieldValues[field.name] = [];
    }
  }

  _getFieldValue(field) {
    return this._fieldValues[field.name];
  }

  _setFieldValue(field, value, {isDeserializing} = {}) {
    if (!isDeserializing) {
      this._saveFieldValue(field);
    }
    value = field.createValue(value, this, {isDeserializing});
    this._fieldValues[field.name] = value;
    return value;
  }

  _applyFieldDefault(field) {
    let value = field.default;
    while (typeof value === 'function') {
      value = value.call(this);
    }
    this._setFieldValue(field, value);
  }

  _fieldHasBeenSet(field) {
    return this._fieldValues && Object.prototype.hasOwnProperty.call(this._fieldValues, field.name);
  }

  _saveFieldValue(field) {
    this._savedFieldValues[field.name] = this._getFieldValue(field);
  }

  commit() {
    this._savedFieldValues = {};

    this.forEachSubmodel(submodel => {
      submodel.commit();
    });
  }

  rollback() {
    for (const [name, value] of Object.entries(this._savedFieldValues)) {
      this._fieldValues[name] = value;
    }
    this._savedFieldValues = {};

    this.forEachSubmodel(submodel => {
      submodel.rollback();
    });
  }

  isChanged() {
    return this._isChanged() === true;
  }

  _isChanged() {
    if (!isEmpty(this._savedFieldValues)) {
      return true;
    }

    return this.forEachSubmodel(submodel => submodel._isChanged());
  }

  fieldIsChanged(field) {
    if (Object.prototype.hasOwnProperty.call(this._savedFieldValues, field.name)) {
      return true;
    }

    const value = this._getFieldValue(field);
    if (value !== undefined) {
      const changedValue = findFromOneOrMany(value, value => {
        if (value?.isOfType && value.isOfType('Model')) {
          return value.isChanged();
        }
      });
      if (changedValue !== undefined) {
        return true;
      }
    }

    return false;
  }

  validate() {
    const failedValidators = this.getFailedValidators();
    if (failedValidators) {
      const error = new Error(
        `Model validation failed (model: '${this.constructor.getName()}', failedValidators: ${JSON.stringify(
          failedValidators
        )})`
      );
      error.failedValidators = failedValidators;
      throw error;
    }
    return true;
  }

  isValid() {
    return this.getFailedValidators() === undefined;
  }

  getFailedValidators() {
    let result;
    this.constructor.forEachField(field => {
      // if (!this._fieldHasBeenSet(field)) {
      //   return;
      // }
      const value = this._getFieldValue(field);
      const failedValidators = field.validateValue(value);
      if (!isEmpty(failedValidators)) {
        if (!result) {
          result = {};
        }
        result[field.name] = failedValidators;
      }
    });
    return result;
  }

  static getName() {
    return this.name;
  }

  isOfType(name) {
    if (name === 'Model') {
      return true; // Optimization
    }

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
