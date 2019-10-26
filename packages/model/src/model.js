import {Observable} from '@liaison/observable';
import {Registerable, Serializable} from '@liaison/layer';
import {hasOwnProperty, getInheritedPropertyDescriptor} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';
import isEmpty from 'lodash/isEmpty';
import {inspect} from 'util';

import {Field, isField} from './field';
import {FieldMask} from './field-mask';
import {Method, isMethod} from './method';

export class Model extends Observable(Serializable(Registerable())) {
  constructor(object = {}) {
    super(object);

    for (const field of this.$getFields()) {
      const name = field.getName();
      if (hasOwnProperty(object, name)) {
        const value = object[name];
        field.createValue(value);
      } else if (field.hasDefaultValue()) {
        field.setValue(field.getDefaultValue());
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
    this.$deserialize({...other.$serialize(), _src: undefined});
  }

  // === Serialization ===

  $serialize({target, fields, filter, includeReferencedEntities} = {}) {
    const serializedFields = {};
    const sources = {};

    const rootFieldMask = this.$createFieldMask({fields, includeReferencedEntities});

    return possiblyAsync.forEach(
      this.$getActiveFields(),
      field => {
        const name = field.getName();

        const fieldMask = rootFieldMask.get(name);
        if (!fieldMask) {
          return;
        }

        return possiblyAsync(filter ? filter.call(this, field) : true, {
          then: isNotFilteredOut => {
            if (isNotFilteredOut) {
              return possiblyAsync(
                field.serializeValue({
                  target,
                  fields: fieldMask,
                  filter,
                  includeReferencedEntities
                }),
                {
                  then: value => {
                    if (value === undefined) {
                      return;
                    }

                    serializedFields[name] = value;

                    if (target === undefined) {
                      const source = field.getSource();
                      if (source !== undefined) {
                        sources[name] = source;
                      }
                    }
                  }
                }
              );
            }
          }
        });
      },
      {
        then: () => {
          return {
            ...super.$serialize(),
            ...(!isEmpty(sources) && {_src: sources}),
            ...serializedFields
          };
        }
      }
    );
  }

  $deserialize(object = {}, {source, fields, filter, includeReferencedEntities} = {}) {
    super.$deserialize(object);

    const sources = source === undefined ? object._src || {} : undefined;

    const rootFieldMask = this.$createFieldMask({fields, includeReferencedEntities});

    const isNew = this.$isNew();

    // TODO: Deserialize unique fields first
    return possiblyAsync.forEach(this.$getFieldNames(), name => {
      const fieldMask = rootFieldMask.get(name);
      if (!fieldMask) {
        return;
      }

      const field = this.$getField(name);

      if (hasOwnProperty(object, name)) {
        const value = object[name];

        return possiblyAsync(filter ? filter.call(this, field) : true, {
          then: isNotFilteredOut => {
            if (isNotFilteredOut) {
              return possiblyAsync(
                field.deserializeValue(value, {
                  source,
                  fields: fieldMask,
                  filter,
                  includeReferencedEntities
                }),
                {
                  then: () => {
                    if (source === undefined) {
                      field.setSource(sources[name]);
                    }
                  }
                }
              );
            }
          }
        });
      }

      if (isNew && field.hasDefaultValue()) {
        field.setValue(field.getDefaultValue());
      }
    });
  }

  static $getInstance(object, previousInstance) {
    if (previousInstance?.constructor === this) {
      return previousInstance;
    }
  }

  // === Fields ===

  static $getFieldConstructor() {
    return Field;
  }

  $getField(name, {throwIfNotFound = true} = {}) {
    const property = this.$getProperty(name, {throwIfNotFound: false});

    if (!property) {
      if (throwIfNotFound) {
        throw new Error(
          `Field not found (name: '${name}'), model: ${this.constructor.$getRegisteredName()}`
        );
      }
      return undefined;
    }

    if (!isField(property)) {
      throw new Error(
        `Found property is not a field (name: '${name}'), model: ${this.constructor.$getRegisteredName()}`
      );
    }

    return property;
  }

  $setField(name, options = {}) {
    return this.__setProperty(this.constructor.$getFieldConstructor(), name, options);
  }

  $hasField(name) {
    return this.$getField(name, {throwIfNotFound: false}) !== undefined;
  }

  $fieldIsActive(name) {
    return this.$getField(name).isActive();
  }

  $activateField(name) {
    this.$getField(name).activate();
  }

  $deactivateField(name) {
    this.$getField(name).deactivate();
  }

  $getFieldValue(name, {throwIfInactive = true} = {}) {
    return this.$getField(name).getValue({throwIfInactive});
  }

  $getFields({fields = true, filter: otherFilter} = {}) {
    if (FieldMask.isFieldMask(fields)) {
      fields = fields.serialize();
    }

    const filter = function (property) {
      if (!isField(property)) {
        return false;
      }

      const field = property;

      const name = field.getName();
      if (!(fields === true || fields[name])) {
        return false;
      }

      if (otherFilter) {
        return otherFilter.call(this, field);
      }

      return true;
    };

    return this.$getProperties({properties: fields, filter});
  }

  $getFieldNames() {
    const fields = this.$getFields();

    return {
      * [Symbol.iterator]() {
        // eslint-disable-next-line guard-for-in
        for (const field of fields) {
          yield field.getName();
        }
      }
    };
  }

  $getFieldValues({fields = true, filter} = {}) {
    const rootFieldMask = this.$createFieldMask({fields, includeReferencedEntities: true});

    const model = this;

    return {
      * [Symbol.iterator]() {
        for (const field of model.$getActiveFields({fields: rootFieldMask, filter})) {
          const name = field.getName();
          const fieldMask = rootFieldMask.get(name);

          for (const value of field.getValues()) {
            yield {value, fields: fieldMask};
          }
        }
      }
    };
  }

  $getUniqueFields({fields = true, filter: otherFilter} = {}) {
    const filter = function (field) {
      if (!field.isUnique()) {
        return false;
      }
      if (otherFilter) {
        return otherFilter.call(this, field);
      }
      return true;
    };

    return this.$getFields({fields, filter});
  }

  $getActiveFields({fields = true, filter: otherFilter} = {}) {
    const filter = function (field) {
      if (!field.isActive()) {
        return false;
      }
      if (otherFilter) {
        return otherFilter.call(this, field);
      }
      return true;
    };

    return this.$getFields({fields, filter});
  }

  // eslint-disable-next-line no-unused-vars
  __onUniqueFieldValueChange(name, value, previousValue) {
    // Overridden in Entity to update indexes
  }

  // === Field masks ===

  $createFieldMask({fields = true, filter, includeReferencedEntities = false} = {}) {
    // TODO: Consider memoizing

    if (FieldMask.isFieldMask(fields)) {
      fields = fields.serialize();
    }

    fields = this.__createFieldMask(fields, {
      filter,
      includeReferencedEntities,
      _typeStack: new Set()
    });

    return new FieldMask(fields);
  }

  __createFieldMask(rootFieldMask, {filter, includeReferencedEntities, _typeStack}) {
    ow(rootFieldMask, 'fields', ow.any(ow.boolean, ow.object));

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
      normalizedFieldMask[name] = field._createFieldMask(fieldMask, {
        filter,
        includeReferencedEntities,
        _typeStack
      });
      _typeStack.delete(type);
    }

    return normalizedFieldMask;
  }

  $createFieldMaskForActiveFields({fields = true} = {}) {
    return this.$createFieldMask({
      fields,
      filter(field) {
        return field.isActive();
      }
    });
  }

  $createFieldMaskForSource(source, {fields = true} = {}) {
    return this.$createFieldMask({
      fields,
      filter(field) {
        return field.getSource() === source;
      }
    });
  }

  $createFieldMaskForExposedFields({fields = true} = {}) {
    return this.$createFieldMask({
      fields,
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

  $getFailedValidators({fields} = {}) {
    const rootFieldMask = this.$createFieldMask({fields});

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

  // === Methods ===

  // --- Static methods ---

  static $getMethodConstructor() {
    return Method;
  }

  static $getMethod(name, {throwIfNotFound = true} = {}) {
    const property = this.$getProperty(name, {throwIfNotFound: false});

    if (!property) {
      if (throwIfNotFound) {
        throw new Error(`Method not found (name: '${name}')`);
      }
      return undefined;
    }

    if (!isMethod(property)) {
      throw new Error(`Found property is not a method (name: '${name}')`);
    }

    return property;
  }

  static $setMethod(name, options = {}) {
    if (this.$hasProperty(name)) {
      this.$getMethod(name); // Make sure the property is a method
    }

    return this.__setProperty(this.$getMethodConstructor(), name, options);
  }

  static $hasMethod(name) {
    return this.$getMethod(name, {throwIfNotFound: false}) !== undefined;
  }

  static $getMethods({filter: otherFilter} = {}) {
    const filter = function (property) {
      if (!isMethod(property)) {
        return false;
      }
      if (otherFilter) {
        return otherFilter.call(this, property);
      }
      return true;
    };

    return this.$getProperties({filter});
  }

  static $getMethodNames() {
    const methods = this.$getMethods();

    return {
      * [Symbol.iterator]() {
        // eslint-disable-next-line guard-for-in
        for (const method of methods) {
          yield method.getName();
        }
      }
    };
  }

  // --- instance methods ---

  $getMethodConstructor() {
    return this.constructor.$getMethodConstructor.call(this);
  }

  $getMethod(name, {throwIfNotFound = true} = {}) {
    return this.constructor.$getMethod.call(this, name, {throwIfNotFound});
  }

  $setMethod(name, options = {}) {
    return this.constructor.$setMethod.call(this, name, options);
  }

  $hasMethod(name) {
    return this.constructor.$hasMethod.call(this, name);
  }

  $getMethods({filter} = {}) {
    return this.constructor.$getMethods.call(this, {filter});
  }

  $getMethodNames() {
    return this.constructor.$getMethodNames.call(this);
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

// === Utilities ===

export function isModel(object) {
  return typeof object?.constructor?.$isModel === 'function';
}

// === Decorators ===

export function field(type, options = {}) {
  // Let's make 'type' optional to better support field overriding
  if (typeof type === 'string') {
    options = {...options, type};
  } else {
    options = type;
  }

  return function (target, name, descriptor) {
    if (!isModel(target)) {
      throw new Error(`@field() target must be a model`);
    }

    if (!(name && descriptor)) {
      throw new Error(`@field() must be used to decorate attributes`);
    }

    if (descriptor.initializer) {
      options = {...options, default: descriptor.initializer};
    }

    target.$setField(name, options);

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
  };
}

export function method(options = {}) {
  return function (target, name, descriptor) {
    if (!(isModel(target) || isModel(target.prototype))) {
      throw new Error(`@method() target must be a model`);
    }

    if (!(name && descriptor)) {
      throw new Error(`@method() must be used to decorate methods`);
    }

    if (descriptor.initializer !== undefined) {
      // @method() is used on an method defined in a parent class
      // Examples: `@method() $get;` or `@method() static $get;`
      descriptor = getInheritedPropertyDescriptor(target, name);
      if (descriptor === undefined) {
        throw new Error(`Cannot use @method() on an undefined property (name: '${name}')`);
      }
    }

    target.$setMethod(name, options);

    return descriptor;
  };
}
