import {inspect} from 'util';
import {Registerable, Serializable} from '@layr/layer';
import {FieldMask, oneOrMany} from '@layr/util';
import isEmpty from 'lodash/isEmpty';

import {Field} from './field';

export class Model extends Serializable(Registerable()) {
  constructor(object = {}, {isDeserializing} = {}) {
    super(object, {isDeserializing});

    this._initializeFields();

    if (isDeserializing) {
      return;
    }

    for (const name of this.constructor.getFieldNames()) {
      const field = this._initializeField(name);

      if (!Object.prototype.hasOwnProperty.call(object, name)) {
        const defaultValue = field.getDefaultValue();
        field.setValue(defaultValue);
        continue;
      }

      const value = object[name];
      field.createValue(value);
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
        const field = this._initializeField(name);
        field.createValue(value);
      }
    }
  }

  _assignOther(other) {
    for (const otherField of other.getFields()) {
      const name = otherField.getName();
      const value = otherField.getValue();
      if (this.constructor.hasField(name)) {
        const field = this._initializeField(name);
        field.setValue(value);
      }
    }
  }

  clone() {
    return this.constructor.deserialize(this.serialize());
  }

  // === Serialization ===

  serialize({target, fields, fieldFilter} = {}) {
    const fieldMask = this.constructor.normalizeFieldMask(fields);
    this._validate({fieldMask, fieldFilter});
    return this._serialize({target, fieldMask, fieldFilter});
  }

  _serialize({target, fieldMask: rootFieldMask, fieldFilter}) {
    const serializedFields = {};

    for (const field of this.getFields({filter: fieldFilter})) {
      const name = field.getName();

      const fieldMask = rootFieldMask.get(name);
      if (!fieldMask) {
        continue;
      }

      const value = field.serializeValue({target, fieldMask, fieldFilter});

      if (value !== undefined) {
        serializedFields[name] = value;
      }
    }

    return {...super.serialize(), ...serializedFields};
  }

  static deserialize(object, {source, previousInstance} = {}) {
    let instance = this.getInstance(object, previousInstance);
    if (instance) {
      instance.deserialize(object, {source});
      return instance;
    }
    instance = new this(object, {isDeserializing: true});
    instance.deserialize(object, {source});
    return instance;
  }

  deserialize(object = {}, {source} = {}) {
    super.deserialize(object);

    const isNew = this.isNew();

    for (const name of this.constructor.getFieldNames()) {
      if (!Object.prototype.hasOwnProperty.call(object, name)) {
        if (isNew) {
          const field = this._initializeField(name);
          const defaultValue = field.getDefaultValue();
          field.setValue(defaultValue);
        }
        continue;
      }

      const field = this._initializeField(name);
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

  // === Class fields ===

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
      const field = this._initializeField(name);
      value = field.setValue(value);
      return value;
    };

    delete descriptor.initializer;
    delete descriptor.writable;
  }

  static getField(name) {
    this._initializeFields();
    const field = this._fields.get(name);
    if (!field) {
      throw new Error(`Field not found (name: '${name}'), model: ${this.getRegisteredName()}`);
    }
    return field;
  }

  static getFields() {
    this._initializeFields();
    return this._fields.values();
  }

  static getFieldNames() {
    return this._fields ? this._fields.keys() : [];
  }

  static setField(name, type, options) {
    if (this._fields?.has(name)) {
      throw new Error(`Field already exists (name: '${name}')`);
    }
    this._initializeFields();
    const field = new Field(this.prototype, name, type, options);
    this._fields.set(name, field);
    return field;
  }

  static hasField(name) {
    return this._fields?.has(name);
  }

  static _initializeFields() {
    if (!this._fields) {
      this._fields = new Map();
    } else if (!Object.prototype.hasOwnProperty.call(this, '_fields')) {
      this._fields = new Map(
        Array.from(this._fields).map(([name, field]) => [name, field.fork(this.prototype)])
      );
    }
  }

  // === Instance fields ===

  getField(name) {
    const field = this._fields.get(name);
    if (!field) {
      throw new Error(
        `Field not found (name: '${name}'), model: ${this.constructor.getRegisteredName()}`
      );
    }
    return field;
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
          // TODO: Get rid of this
          continue;
        }
        if (!value.hasFields(fieldMask)) {
          return false;
        }
      }
    }

    return true;
  }

  _initializeFields() {
    this._fields = new Map();
  }

  _initializeField(name) {
    let field = this._fields.get(name);
    if (field) {
      return field;
    }
    const modelField = this.constructor.getField(name);
    field = modelField.fork(this);
    this._fields.set(name, field);
    return field;
  }

  // === Field masks ===

  static normalizeFieldMask(fields) {
    const fieldMask = new FieldMask(fields);
    const normalizedFieldMask = this._normalizeFieldMask(fieldMask, {_isRoot: true});
    return new FieldMask(normalizedFieldMask);
  }

  static _normalizeFieldMask(rootFieldMask, {_isRoot} = {}) {
    const normalizedFieldMask = {};

    for (const field of this.getFields()) {
      const name = field.getName();

      const fieldMask = rootFieldMask.get(name);
      if (!fieldMask) {
        continue;
      }

      normalizedFieldMask[name] = field.normalizeFieldMask(fieldMask);
    }

    return normalizedFieldMask;
  }

  // static filterEntityFields(fields) {
  //   fields = new FieldMask(fields);
  //   fields = this._filterEntityFields(fields);
  //   return new FieldMask(fields);
  // }

  // static _filterEntityFields(rootFields) {
  //   const filteredFields = {};

  //   for (const field of this.getFields()) {
  //     const name = field.getName();

  //     const fields = rootFields.get(name);
  //     if (!fields) {
  //       continue;
  //     }

  //     if (field.scalar.isPrimitiveType()) {
  //       filteredFields[name] = true;
  //       continue;
  //     }

  //     const Model = field.scalar.getModel(this._getLayer());

  //     if (Model.prototype.isOfType('EntityModel')) {
  //       filteredFields[name] = {};
  //       continue;
  //     }

  //     filteredFields[name] = Model._filterEntityFields(fields);
  //   }

  //   return filteredFields;
  // }

  // static fieldValueIsSubmodel(value) {
  //   return value?.isOfType && !value.isOfType('EntityModel');
  // }

  // static fieldValueIsNestedEntity(value) {
  //   return value?.isOfType && value.isOfType('EntityModel');
  // }

  // forEachSubmodel(func) {
  //   return this.forEachField(field => {
  //     const value = this._getFieldValue(field);
  //     return callWithOneOrMany(value, value => {
  //       if (this.constructor.fieldValueIsSubmodel(value)) {
  //         return func(value);
  //       }
  //     });
  //   });
  // }

  // forEachNestedEntityDeep(func, {fields} = {}) {
  //   const rootFields = new FieldMask(fields);

  //   return this.constructor.forEachField(field => {
  //     const name = field.getName();

  //     const fields = rootFields.get(name);
  //     if (!fields) {
  //       return;
  //     }

  //     const value = this._getFieldValue(field);
  //     if (value !== undefined) {
  //       return callWithOneOrMany(value, value => {
  //         if (this.constructor.fieldValueIsNestedEntity(value)) {
  //           const result = func(value, {fields});
  //           if (result !== undefined) {
  //             return result;
  //           }
  //         }

  //         if (value?.isOfType && value.isOfType('Model')) {
  //           return value.forEachNestedEntityDeep(func, {fields});
  //         }
  //       });
  //     }
  //   });
  // }

  // === Validation ===

  validate({fields, fieldFilter} = {}) {
    const fieldMask = this.constructor.normalizeFieldMask(fields);
    this._validate({fieldMask, fieldFilter});
  }

  _validate({fieldMask, fieldFilter}) {
    const failedValidators = this._getFailedValidators({fieldMask, fieldFilter});
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

  isValid({fields, fieldFilter} = {}) {
    return this.getFailedValidators({fields, fieldFilter}) === undefined;
  }

  getFailedValidators({fields, fieldFilter} = {}) {
    const fieldMask = this.constructor.normalizeFieldMask(fields);
    return this._getFailedValidators({fieldMask, fieldFilter});
  }

  _getFailedValidators({fieldMask, fieldFilter}) {
    let result;
    for (const field of this.getFields({filter: fieldFilter})) {
      const name = field.getName();
      const failedValidators = field.validateValue({fieldMask, fieldFilter});
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

  static isModel(object) {
    return typeof object?.constructor.isModel === 'function';
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
