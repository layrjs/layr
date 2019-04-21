import {inspect} from 'util';
import {FieldMask, findFromOneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';

import {Field} from './field';

export class Model {
  static create(object, options) {
    return new this(object, options);
  }

  constructor(object, options) {
    this._activeFields = new Set();
    this._fieldValues = {};
    this._savedFieldValues = {};

    this.initialize(object, options);
  }

  initialize(object = {}, {fields, isDeserializing} = {}) {
    if (typeof object !== 'object') {
      throw new Error(
        `Type mismatch (model: '${this.constructor.getName()}', expected: 'object', provided: '${typeof object}')`
      );
    }

    const rootFields = fields !== undefined ? new FieldMask(fields) : undefined;

    const isNew = isDeserializing ? Boolean(object._new) : true;

    this.constructor.forEachField(field => {
      let fields;
      if (rootFields) {
        fields = rootFields.get(field.name);
        if (!fields) {
          return;
        }
      } else if (
        !(
          isNew ||
          Object.prototype.hasOwnProperty.call(object, field.name) ||
          object._undefined?.includes(field.name)
        )
      ) {
        return;
      }

      const value = object[field.name];
      this._setFieldValue(field, value, {fields, isDeserializing});
      if (value === undefined && isNew) {
        this._applyFieldDefault(field);
      }
    });

    if (isNew) {
      this.markAsNew();
    }
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
    other.forEachField(otherField => {
      const field = this.constructor.getField(otherField.name);
      if (field) {
        const value = other._getFieldValue(otherField);
        this._setFieldValue(field, value);
      }
    });
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  // === Serialization ===

  serialize({filter, ...otherOptions} = {}) {
    const definedFields = {};

    const isNew = this.isNew();

    let undefinedFields;
    if (!isNew) {
      undefinedFields = [];
    }

    this.forEachField(field => {
      if (filter && !filter(this, field)) {
        return;
      }
      let value = this._getFieldValue(field);
      value = field.serializeValue(value, {filter, ...otherOptions, _isDeep: true});
      if (value !== undefined) {
        definedFields[field.name] = value;
      } else if (!isNew) {
        undefinedFields.push(field.name);
      }
    });

    return {
      ...(isNew && {_new: true}),
      _type: this.constructor.getName(),
      ...definedFields,
      ...(undefinedFields?.length && {_undefined: undefinedFields})
    };
  }

  toJSON() {
    return this.serialize();
  }

  static deserialize(object, {fields} = {}) {
    return this.create(object, {fields, isDeserializing: true});
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

  getField(name) {
    const field = this.constructor.getField(name);
    if (field && this.fieldIsActive(field)) {
      return field;
    }
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

  activateField(field) {
    this._activeFields.add(field.name);
  }

  fieldIsActive(field) {
    return this._activeFields.has(field.name);
  }

  fieldsAreActive(fields) {
    const rootFields = new FieldMask(fields);
    const result = this.constructor.forEachField(field => {
      const fields = rootFields.get(field.name);
      if (!fields) {
        return;
      }
      if (!this.fieldIsActive(field)) {
        return false;
      }
      // TODO: Check submodels
    });
    return result !== false;
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

  forEachField(func) {
    return this.constructor.forEachField(field => {
      if (this.fieldIsActive(field)) {
        return func(field);
      }
    });
  }

  static fieldValueIsSubmodel(value) {
    return value?.isOfType && !value.isOfType('Entity');
  }

  static fieldValueIsNestedEntity(value) {
    return value?.isOfType && value.isOfType('Entity');
  }

  forEachSubmodel(func) {
    return this.forEachField(field => {
      const value = this._getFieldValue(field);
      return findFromOneOrMany(value, value => {
        if (this.constructor.fieldValueIsSubmodel(value)) {
          return func(value) !== undefined;
        }
      });
    });
  }

  // forEachNestedEntity(func, {fields: rootFields = true} = {}) {
  //   // TODO: Remove 'fields' option?
  //   return this.forEachField(field => {
  //     let fields = typeof rootFields === 'object' ? rootFields[fields.name] : rootFields;

  //     if (fields === undefined || fields === false) {
  //       return;
  //     }

  //     const value = this._getFieldValue(field);

  //     if (Array.isArray(value) && !(fields === true || Array.isArray(fields))) {
  //       throw new Error(
  //         `Type mismatch in forEachNestedEntity() 'fields' option (model: '${this.constructor.getName()}', field: '${
  //           field.name
  //         }', expected: 'Boolean' or 'Array', provided: '${typeof fields}')`
  //       );
  //     }

  //     if (Array.isArray(fields)) {
  //       if (!Array.isArray(value)) {
  //         throw new Error(
  //           `Type mismatch in forEachNestedEntity() 'fields' option (model: '${this.constructor.getName()}', field: '${
  //             field.name
  //           }', expected: 'Boolean' or 'Object', provided: 'Array')`
  //         );
  //       }
  //       fields = fields[0];
  //     }

  //     return findFromOneOrMany(value, value => {
  //       if (this.constructor.fieldValueIsNestedEntity(value)) {
  //         return func(value, {fields}) !== undefined;
  //       }

  //       if (value?.isOfType && value.isOfType('Model')) {
  //         return value.forEachNestedEntity(func, {fields}) !== undefined;
  //       }
  //     });
  //   });
  // }

  _getFieldValue(field) {
    let value = this._fieldValues[field.name];
    if (value === undefined && field.isArray) {
      value = [];
      this._fieldValues[field.name] = value;
    }
    return value;
  }

  _setFieldValue(field, value, {fields, isDeserializing} = {}) {
    if (!isDeserializing) {
      this._saveFieldValue(field);
    }
    const registry = this.constructor._getRegistry({throwIfNotFound: false});
    value = field.createValue(value, {registry, fields, isDeserializing});
    this._fieldValues[field.name] = value;
    this.activateField(field);
    return value;
  }

  _applyFieldDefault(field) {
    let value = field.default;
    while (typeof value === 'function') {
      value = value.call(this);
    }
    if (value !== undefined) {
      this._setFieldValue(field, value);
    }
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
    this.forEachField(field => {
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
    const {result} = await remoteRegistry.invokeQuery({
      '<=': this,
      [`${methodName}=>result`]: {
        '([])': args
      },
      '=>changes': true
    });
    return result;
  }

  static getName() {
    return this.name;
  }

  // === Utilities ===

  [inspect.custom]() {
    const object = {};
    this.forEachField(field => {
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
