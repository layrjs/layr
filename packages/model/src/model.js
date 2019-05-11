import {inspect} from 'util';
import {Registerable, Serializable} from '@storable/layer';
import {FieldMask, callWithOneOrMany, oneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';

import {Field} from './field';

export class Model extends Serializable(Registerable()) {
  static _fields = new Map();

  constructor(object = {}, {fields, deserialize, ...options} = {}) {
    super(object, {deserialize, ...options});

    this._fields = new Map();

    if (deserialize) {
      return;
    }

    const rootFields = fields !== undefined ? new FieldMask(fields) : undefined;

    for (const name of this.constructor.getFieldNames()) {
      let fields;
      if (rootFields) {
        fields = rootFields.get(name);
        if (!fields) {
          continue;
        }
      }

      const field = this.initializeField(name);

      if (!Object.prototype.hasOwnProperty.call(object, name)) {
        const defaultValue = field.getDefaultValue();
        field.setValue(defaultValue);
        continue;
      }

      const value = object[name];
      field.createValue(value, {fields});
    }
  }

  assign(object) {
    if (object === undefined) {
      // NOOP
    } else if (Model.isModel(object)) {
      this._assignOther(object);
    } else if (typeof object === 'object') {
      this._assignObject(object);
    } else {
      throw new Error(
        `Type mismatch (expected: 'Model' or 'Object', received: '${typeof object}')`
      );
    }
  }

  _assignObject(object) {
    for (const [name, value] of Object.entries(object)) {
      if (this.constructor.hasField(name)) {
        const field = this.initializeField(name);
        field.createValue(value);
      }
    }
  }

  _assignOther(other) {
    for (const otherField of other.getFields()) {
      const name = otherField.getName();
      const value = otherField.getValue();
      if (this.constructor.hasField(name)) {
        const field = this.initializeField(name);
        field.setValue(value);
      }
    }
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  // === Serialization ===

  serialize({target, fieldFilter, _isDeep, ...otherOptions} = {}) {
    if (!_isDeep) {
      this.validate({fieldFilter});
    }

    const fields = {};

    for (const field of this.getFields({filter: fieldFilter})) {
      const name = field.getName();
      const value = field.serializeValue({
        target,
        fieldFilter,
        _isDeep: true,
        ...otherOptions
      });
      if (value !== undefined) {
        fields[name] = value;
      }
    }

    return {...super.serialize({target, _isDeep, ...otherOptions}), ...fields};
  }

  static deserialize(object, {source, previousInstance} = {}) {
    const instance = this.getInstance(object, previousInstance);
    if (instance) {
      instance.deserialize(object, {source});
      return instance;
    }
    return super.deserialize(object, {source});
  }

  deserialize(object = {}, {source} = {}) {
    super.deserialize(object);

    const isNew = this.isNew();

    for (const name of this.constructor.getFieldNames()) {
      if (!Object.prototype.hasOwnProperty.call(object, name)) {
        if (isNew) {
          const field = this.initializeField(name);
          const defaultValue = field.getDefaultValue();
          field.setValue(defaultValue);
        }
        continue;
      }

      const field = this.initializeField(name);
      const value = object[name];
      const previousValue = field.getValue();
      field.deserializeValue(value, {source, previousValue});
    }
  }

  static getInstance(object, previousInstance) {
    if (previousInstance?.constructor === this) {
      return previousInstance;
    }
  }

  // === Fields ===

  static defineField(name, type, options, descriptor) {
    if (descriptor.initializer) {
      options = {...options, default: descriptor.initializer};
    }

    this.setField(name, type, options);

    descriptor.get = function () {
      const field = this.getField(name);
      return field.getValue();
    };
    descriptor.set = function (value) {
      const field = this.initializeField(name);
      value = field.setValue(value);
      return value;
    };

    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static getField(name) {
    const field = this._fields.get(name);
    if (!field) {
      throw new Error(`Field not found (name: '${name}'), model: ${this.getRegisteredName()}`);
    }
    return field;
  }

  getField(name) {
    const field = this._fields.get(name);
    if (!field) {
      throw new Error(
        `Field not found (name: '${name}'), model: ${this.constructor.getRegisteredName()}`
      );
    }
    return field;
  }

  static getFields() {
    return this._fields.values();
  }

  getFields({filter} = {}) {
    return {
      [Symbol.iterator]: () => {
        const fieldIterator = this._fields.values()[Symbol.iterator]();
        return {
          next: () => {
            while (true) {
              const {value, done} = fieldIterator.next();
              if (value && filter && !filter.call(this, value)) {
                continue;
              }
              return {value, done};
            }
          }
        };
      }
    };
  }

  static getFieldNames() {
    return this._fields.keys();
  }

  static setField(name, type, options) {
    if (this._fields.has(name)) {
      throw new Error(`Field already exists (name: '${name}')`);
    }
    if (!Object.prototype.hasOwnProperty.call(this, '_fields')) {
      this._fields = new Map(this._fields);
    }
    const field = new Field(name, type, options);
    this._fields.set(name, field);
    return field;
  }

  initializeField(name) {
    let field = this._fields.get(name);
    if (field) {
      return field;
    }
    const modelField = this.constructor.getField(name);
    field = modelField.fork(this);
    this._fields.set(name, field);
    return field;
  }

  static hasField(name) {
    return this._fields.has(name);
  }

  hasField(name) {
    return this._fields.has(name);
  }

  hasFields(fieldMask) {
    const rootFieldMask = new FieldMask(fieldMask);

    for (const name of this.constructor.getFieldNames()) {
      const fieldMask = rootFieldMask.get(name);
      if (!fieldMask) {
        continue;
      }

      const field = this._fields.get(name);
      if (!field) {
        return false;
      }

      const valueOrValues = field.getValue();
      if (valueOrValues === undefined) {
        continue;
      }

      for (const value of oneOrMany(valueOrValues)) {
        if (!this.constructor.fieldValueIsSubmodel(value)) {
          continue;
        }
        if (!value.hasFields(fieldMask)) {
          return false;
        }
      }
    }

    return true;
  }

  static filterEntityFields(fields) {
    fields = new FieldMask(fields);
    fields = this._filterEntityFields(fields);
    return new FieldMask(fields);
  }

  static _filterEntityFields(rootFields) {
    const filteredFields = {};

    for (const field of this.getFields()) {
      const name = field.getName();

      const fields = rootFields.get(name);
      if (!fields) {
        continue;
      }

      if (field.scalar.isPrimitiveType()) {
        filteredFields[name] = true;
        continue;
      }

      const Model = field.scalar.getModel(this._getLayer());

      if (Model.prototype.isOfType('EntityModel')) {
        filteredFields[name] = {};
        continue;
      }

      filteredFields[name] = Model._filterEntityFields(fields);
    }

    return filteredFields;
  }

  static fieldValueIsSubmodel(value) {
    return value?.isOfType && !value.isOfType('EntityModel');
  }

  static fieldValueIsNestedEntity(value) {
    return value?.isOfType && value.isOfType('EntityModel');
  }

  forEachSubmodel(func) {
    return this.forEachField(field => {
      const value = this._getFieldValue(field);
      return callWithOneOrMany(value, value => {
        if (this.constructor.fieldValueIsSubmodel(value)) {
          return func(value);
        }
      });
    });
  }

  forEachNestedEntityDeep(func, {fields} = {}) {
    const rootFields = new FieldMask(fields);

    return this.constructor.forEachField(field => {
      const name = field.getName();

      const fields = rootFields.get(name);
      if (!fields) {
        return;
      }

      const value = this._getFieldValue(field);
      if (value !== undefined) {
        return callWithOneOrMany(value, value => {
          if (this.constructor.fieldValueIsNestedEntity(value)) {
            const result = func(value, {fields});
            if (result !== undefined) {
              return result;
            }
          }

          if (value?.isOfType && value.isOfType('Model')) {
            return value.forEachNestedEntityDeep(func, {fields});
          }
        });
      }
    });
  }

  // === Validation ===

  validate({fieldFilter} = {}) {
    const failedValidators = this.getFailedValidators({fieldFilter});
    if (failedValidators) {
      const error = new Error(
        `Model validation failed (model: '${this.constructor.getRegisteredName()}', failedValidators: ${JSON.stringify(
          failedValidators
        )})`
      );
      error.failedValidators = failedValidators;
      throw error;
    }
  }

  isValid({fieldFilter} = {}) {
    return this.getFailedValidators({fieldFilter}) === undefined;
  }

  getFailedValidators({fieldFilter} = {}) {
    let result;
    for (const field of this.getFields({filter: fieldFilter})) {
      const name = field.getName();
      const failedValidators = field.validateValue({fieldFilter});
      if (!isEmpty(failedValidators)) {
        if (!result) {
          result = {};
        }
        result[name] = failedValidators;
      }
    }
    return result;
  }

  // === Utilities ===

  static _isModel = true;

  static isModel(object) {
    return object?.constructor._isModel === true;
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

  [inspect.custom]() {
    const object = {};
    for (const field of this.getFields()) {
      const name = field.getName();
      const value = field.getValue();
      if (value !== undefined) {
        object[name] = value;
      }
    }
    return object;
  }
}

// === Decorators ===

export function field(type, options) {
  return function (target, name, descriptor) {
    target.constructor.defineField(name, type, options, descriptor);
  };
}
