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
      this.__assignOther(object);
    } else if (typeof object === 'object') {
      this.__assignObject(object);
    } else {
      throw new Error(
        `Type mismatch (expected: 'Model' or 'Object', received: '${typeof object}')`
      );
    }
  }

  __assignObject(object) {
    for (const [name, value] of Object.entries(object)) {
      if (this.$hasField(name)) {
        const field = this.$getField(name);
        field.createValue(value);
      }
    }
  }

  __assignOther(other) {
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
    const fields = this.__getFields();

    let field = fields[name];

    if (!field) {
      throw new Error(
        `Field not found (name: '${name}'), model: ${this.constructor.$getRegisteredName()}`
      );
    }

    if (!Object.prototype.hasOwnProperty.call(fields, name)) {
      field = field.fork(this);
      fields[name] = field;
    }

    return field;
  }

  $getFields({filter} = {}) {
    const model = this;

    return {
      * [Symbol.iterator]() {
        for (const name of model.$getFieldNames()) {
          const field = model.$getField(name);

          if (filter && !filter(field)) {
            continue;
          }

          yield field;
        }
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
    const fields = this.__fields;

    return {
      * [Symbol.iterator]() {
        if (fields) {
          // eslint-disable-next-line guard-for-in
          for (const name in fields) {
            yield name;
          }
        }
      }
    };
  }

  $getFieldValues({filter} = {}) {
    const model = this;

    return {
      * [Symbol.iterator]() {
        for (const field of model.$getActiveFields({filter})) {
          for (const value of field.getValues()) {
            yield value;
          }
        }
      }
    };
  }

  $setField(name, type, options) {
    if (this.$hasField(name)) {
      throw new Error(`Field already exists (name: '${name}')`);
    }

    const fields = this.__getFields();

    const field = new Field(this, name, type, options);
    fields[name] = field;

    return field;
  }

  $hasField(name) {
    return this.__fields ? name in this.__fields : false;
  }

  __getFields() {
    if (!this.__fields) {
      this.__fields = Object.create(null);
    } else if (!Object.prototype.hasOwnProperty.call(this, '__fields')) {
      this.__fields = Object.create(this.__fields);
    }

    return this.__fields;
  }

  // === Field masks ===

  $createFieldMask(fields = true, {filter} = {}) {
    // TODO: Consider memoizing

    if (FieldMask.isFieldMask(fields)) {
      fields = fields.serialize();
    }

    fields = this.__createFieldMask(fields, {filter});

    return new FieldMask(fields);
  }

  __createFieldMask(rootFieldMask, {filter, _typeStack = new Set()}) {
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
