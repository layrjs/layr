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

    const isNew = isDeserializing ? object._new : true;

    this._fieldValues = {};
    this._savedFieldValues = {};

    this.constructor.forEachField(field => {
      const name = isDeserializing ? field.serializedName : field.name;
      if (Object.prototype.hasOwnProperty.call(object, name)) {
        const value = object[name];
        this._setFieldValue(field, value, {isDeserializing});
        return;
      }

      if (isNew) {
        if (field.default !== undefined) {
          this._applyFieldDefault(field);
        } else {
          this._initializeFieldValue(field);
        }
      }
    });

    if (isNew) {
      this.markAsNew();
    }
  }

  // === Serialization ===

  serialize({filter, ...otherOptions} = {}) {
    const result = {};

    if (this.isNew()) {
      result._new = true;
    }

    result._type = this.constructor.getName();

    this.constructor.forEachField(field => {
      if (!this._fieldHasBeenSet(field)) {
        return;
      }
      if (filter && !filter(this, field)) {
        return;
      }
      let value = this._getFieldValue(field);
      value = field.serializeValue(value, {filter, ...otherOptions, _isDeep: true});
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

  // === Core ===

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

  static canBeSubmodel() {
    return true;
  }

  static fieldValueIsSubmodel(value) {
    return value?.isOfType && value.isOfType('Model') && value.constructor.canBeSubmodel();
  }

  forEachSubmodel(func) {
    return this.constructor.forEachField(field => {
      const value = this._getFieldValue(field);
      return findFromOneOrMany(value, value => {
        if (this.constructor.fieldValueIsSubmodel(value)) {
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
    const registry = this.constructor._getRegistry({throwIfNotFound: false});
    value = field.createValue(value, {registry, isDeserializing});
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
        if (this.constructor.fieldValueIsSubmodel(value)) {
          return value.isChanged();
        }
      });
      if (changedValue !== undefined) {
        return true;
      }
    }

    return false;
  }

  isNew() {
    return this._new === true;
  }

  markAsNew() {
    this._new = true;
  }

  markAsNotNew() {
    this._new = false;
  }

  static _getRegistry({throwIfNotFound = true} = {}) {
    if (!this.$registry && throwIfNotFound) {
      throw new Error(`Registry not found (model: ${this.getName()})`);
    }
    return this.$registry;
  }

  // === Validation ===

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

  // === Remote invocation ===

  static defineRemoteMethod(name, descriptor) {
    descriptor.value = async function (...args) {
      return this.callRemote(name, ...args);
    };
    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static async callRemote(methodName, ...args) {
    const remoteRegistry = this._getRemoteRegistry();
    const {result} = await remoteRegistry.invokeQuery({
      [`${this.getName()}=>`]: {
        [`${methodName}=>result`]: {
          '([])': args
        }
      }
    });
    return result;
  }

  async callRemote(methodName, ...args) {
    const remoteRegistry = this.constructor._getRemoteRegistry();
    const {result, changes} = await remoteRegistry.invokeQuery({
      '<=': this,
      [`${methodName}=>result`]: {
        '([])': args
      },
      '=>changes': true
    });
    this.assign(changes);
    return result;
  }

  static getName() {
    return this.name;
  }

  // === Utilities ===

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  assign(object) {
    if (object === undefined) {
      // NOOP
    } else if (object.isOfType && object.isOfType('Model')) {
      this._assignOther(object);
    } else {
      this._assignObject(object);
    }
  }

  _assignObject(object) {
    for (const [name, value] of Object.entries(object)) {
      const field = this.constructor.getField(name);
      if (field) {
        this._setFieldValue(field, value);
      }
    }
  }

  _assignOther(other) {
    this.constructor.forEachField(field => {
      const otherField = other.constructor.getField(field.name);
      if (otherField && other._fieldHasBeenSet(otherField)) {
        const value = other._getFieldValue(otherField);
        this._setFieldValue(field, value);
      }
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

  static _getRemoteRegistry() {
    const registry = this._getRegistry();
    if (!registry.remoteRegistry) {
      throw new Error(`Remote registry not found (model: ${this.name})`);
    }
    return registry.remoteRegistry;
  }
}

// === Decorators ===

export function field(type, options) {
  return function (target, name, descriptor) {
    target.constructor.defineField(name, type, options, descriptor);
  };
}

export function remoteMethod() {
  return function (target, name, descriptor) {
    if (!(typeof target === 'function')) {
      // The target is the prototype
      target = target.constructor;
    }
    target.defineRemoteMethod(name, descriptor);
  };
}
