import {Observable} from '@liaison/observable';
import {Registerable, Serializable} from '@liaison/layer';
import isEmpty from 'lodash/isEmpty';
import {inspect} from 'util';

import {Field} from './field';
import {FieldMask} from './field-mask';

export class Model extends Observable(Serializable(Registerable())) {
  constructor(object = {}, {isDeserializing} = {}) {
    super(object, {isDeserializing});

    if (isDeserializing) {
      return;
    }

    for (const field of this.$getFields()) {
      const name = field.getName();
      if (Object.prototype.hasOwnProperty.call(object, name)) {
        const value = object[name];
        field.createValue(value);
      } else {
        const defaultValue = field.getDefaultValue();
        field.setValue(defaultValue);
      }
    }
  }

  $assign(object) {
    if (object === undefined) {
      // NOOP
    } else if (Model.$isModel(object)) {
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
      if (this.$hasField(name)) {
        const field = this.$getField(name);
        field.createValue(value);
      }
    }
  }

  _assignOther(other) {
    for (const otherField of other.$getActiveFields()) {
      const name = otherField.getName();
      if (this.$hasField(name)) {
        const field = this.$getField(name);
        const value = otherField.getValue();
        field.setValue(value);
      }
    }
  }

  $clone() {
    return this.constructor.$deserialize(this.$serialize());
  }

  // === Serialization ===

  $serialize({target, fields} = {}) {
    const targetIsLower = () => {
      if (target === undefined) {
        return false;
      }

      const layer = this.$getLayer({throwIfNotFound: false});
      const parentLayer = layer?.getParent({throwIfNotFound: false});
      return !(target === layer?.getId() || target === parentLayer?.getId());
    };

    const rootFieldMask = targetIsLower() ?
      this.$createFieldMaskForExposedFields(fields) :
      this.$createFieldMask(fields);

    const serializedFields = {};

    for (const field of this.$getActiveFields()) {
      const name = field.getName();

      const fieldMask = rootFieldMask.get(name);
      if (!fieldMask) {
        continue;
      }

      const value = field.serializeValue({target, fields: fieldMask});

      if (value !== undefined) {
        serializedFields[name] = value;
      }
    }

    return {...super.$serialize(), ...serializedFields};
  }

  $deserialize(object = {}, {source} = {}) {
    super.$deserialize(object);

    const isNew = this.$isNew();

    for (const name of this.$getFieldNames()) {
      if (Object.prototype.hasOwnProperty.call(object, name)) {
        const field = this.$getField(name);
        const value = object[name];
        field.deserializeValue(value, {source});
      } else if (isNew) {
        const field = this.$getField(name);
        const defaultValue = field.getDefaultValue();
        field.setValue(defaultValue);
      }
    }
  }

  static $getInstance(object, previousInstance) {
    if (previousInstance?.constructor === this) {
      return previousInstance;
    }
  }

  // === Fields ===

  $defineField(name, type, options, descriptor) {
    if (descriptor.initializer) {
      options = {...options, default: descriptor.initializer};
    }

    this.$setField(name, type, options);

    return {
      configurable: false,
      enumerable: false,
      get() {
        const field = this.$getField(name);
        return field.getValue();
      },
      set(value) {
        const field = this.$getField(name);
        return field.setValue(value);
      }
    };
  }

  $getField(name) {
    const field = this._fields?.get(name);
    if (!field) {
      throw new Error(
        `Field not found (name: '${name}'), model: ${this.constructor.$getRegisteredName()}`
      );
    }
    return this._initializeField(field);
  }

  $getFields({filter} = {}) {
    return {
      [Symbol.iterator]: () => {
        const iterator = (this._fields || []).values()[Symbol.iterator]();
        return {
          next: () => {
            while (true) {
              let {value: field, done} = iterator.next();
              if (field) {
                field = this._initializeField(field);
                if (filter && !filter(field)) {
                  continue;
                }
              }
              return {value: field, done};
            }
          }
        };
      }
    };
  }

  $getActiveFields({filter: otherFilter} = {}) {
    const filter = function (field) {
      if (!field.isActive()) {
        return false;
      }
      if (otherFilter) {
        return otherFilter(field);
      }
      return true;
    };
    return this.$getFields({filter});
  }

  $getFieldNames() {
    return this._fields ? this._fields.keys() : [];
  }

  $getFieldValues({filter} = {}) {
    return {
      [Symbol.iterator]: () => {
        const fieldIterator = this.$getActiveFields({filter})[Symbol.iterator]();
        let valueIterator;

        return {
          next: () => {
            while (true) {
              if (!valueIterator) {
                const {value: field} = fieldIterator.next();
                if (!field) {
                  return {value: undefined, done: true};
                }
                valueIterator = field.getValues()[Symbol.iterator]();
              }

              const {value, done} = valueIterator.next();
              if (!done) {
                return {value, done: false};
              }
              valueIterator = undefined;
            }
          }
        };
      }
    };
  }

  $setField(name, type, options) {
    if (this._fields?.has(name)) {
      throw new Error(`Field already exists (name: '${name}')`);
    }
    this._initializeFields();
    const field = new Field(this, name, type, options);
    this._fields.set(name, field);
    return field;
  }

  $hasField(name) {
    return this._fields?.has(name);
  }

  _initializeFields() {
    if (!this._fields) {
      this._fields = new Map();
    } else if (!Object.prototype.hasOwnProperty.call(this, '_fields')) {
      this._fields = new Map(this._fields);
    }
  }

  _initializeField(field) {
    if (field.getParent() !== this) {
      this._initializeFields();
      field = field.fork(this);
      this._fields.set(field.getName(), field);
    }
    return field;
  }

  // === Field masks ===

  $createFieldMask(fields = true, {filter} = {}) {
    // TODO: Consider memoizing

    if (FieldMask.isFieldMask(fields)) {
      fields = fields.serialize();
    }

    fields = this._createFieldMask(fields, {filter});

    return new FieldMask(fields);
  }

  _createFieldMask(rootFieldMask, {filter, _typeStack = new Set()}) {
    const normalizedFieldMask = {};

    for (const field of this.$getFields({filter})) {
      const type = field.getScalar().getType();
      if (_typeStack.has(type)) {
        continue; // Avoid looping indefinitely when a circular type is encountered
      }

      const name = field.getName();

      const fieldMask = typeof rootFieldMask === 'object' ? rootFieldMask[name] : rootFieldMask;
      if (!fieldMask) {
        continue;
      }

      _typeStack.add(type);
      normalizedFieldMask[name] = field._createFieldMask(fieldMask, {filter, _typeStack});
      _typeStack.delete(type);
    }

    return normalizedFieldMask;
  }

  $createFieldMaskForActiveFields() {
    return this.$createFieldMask(true, {
      filter(field) {
        return field.isActive();
      }
    });
  }

  $createFieldMaskForExposedFields(fields = true) {
    return this.$createFieldMask(fields, {
      filter(field) {
        return field.isExposed();
      }
    });
  }

  // === Validation ===

  $validate({fields} = {}) {
    const failedValidators = this.$getFailedValidators({fields});
    if (failedValidators) {
      const error = new Error(
        `Model validation failed (model: '${this.constructor.$getRegisteredName()}', failedValidators: ${JSON.stringify(
          failedValidators
        )})`
      );
      error.failedValidators = failedValidators;
      throw error;
    }
  }

  $isValid({fields} = {}) {
    return this.$getFailedValidators({fields}) === undefined;
  }

  $getFailedValidators({fields, isDeep: _isDeep} = {}) {
    const rootFieldMask = this.$createFieldMask(fields);

    let result;

    for (const field of this.$getActiveFields()) {
      const name = field.getName();

      const fieldMask = rootFieldMask.get(name);
      if (!fieldMask) {
        continue;
      }

      const failedValidators = field.getFailedValidators({fields: fieldMask});
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

  get super() {
    const handler = {
      // TODO: Consider implementing more handlers

      get(target, name) {
        const prototype = Object.getPrototypeOf(target.constructor.prototype);

        let value = prototype[name];

        if (typeof value === 'function') {
          value = value.bind(target);
        }

        return value;
      }
    };

    return new Proxy(this, handler);
  }

  static $isModel(object) {
    return isModel(object);
  }

  [inspect.custom]() {
    const object = {};
    for (const field of this.$getActiveFields()) {
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
    return target.$defineField(name, type, options, descriptor);
  };
}

// === Utilities ===

export function isModel(object) {
  return typeof object?.constructor?.$isModel === 'function';
}
