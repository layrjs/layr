import {createObservable, isObservable, canBecomeObservable} from '@liaison/observable';
import {mapFromOneOrMany, hasOwnProperty} from '@liaison/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import isPlainObject from 'lodash/isPlainObject';
import ow from 'ow';

import {Property} from './property';
import {runValidators, normalizeValidator, REQUIRED_VALIDATOR_NAME} from './validation';

export class Field extends Property {
  constructor(parent, name, options = {}) {
    let {
      type,
      default: defaultValue,
      isUnique = false,
      validators = [],
      ...unknownOptions
    } = options;

    super(parent, name, unknownOptions);

    this._options = options;

    ow(type, ow.string.nonEmpty);
    ow(validators, ow.array);
    ow(isUnique, ow.boolean);

    validators = validators.map(validator =>
      mapFromOneOrMany(validator, validator => normalizeValidator(validator, {fieldName: name}))
    );

    this._type = type;

    let scalarType;
    let scalarIsOptional;
    let scalarValidators;

    const isArray = type.endsWith('[]') || type.endsWith('[]?');
    let arrayIsOptional;

    if (isArray) {
      if (type.endsWith('?')) {
        arrayIsOptional = true;
        scalarType = type.slice(0, -3);
      } else {
        scalarType = type.slice(0, -2);
      }
      const index = validators.findIndex(validator => Array.isArray(validator));
      if (index !== -1) {
        scalarValidators = validators[index];
        validators.splice(index, 1);
      } else {
        scalarValidators = [];
      }
    } else {
      scalarType = type;
      scalarValidators = validators;
      validators = [];
    }

    if (scalarType.endsWith('?')) {
      scalarIsOptional = true;
      scalarType = scalarType.slice(0, -1);
    }

    if (!scalarType) {
      throw new Error("'type' parameter is invalid");
    }

    if (isUnique) {
      if (isArray) {
        throw new Error(`A unique field cannot be an array (field: '${name}')`);
      }

      if (scalarIsOptional) {
        throw new Error(`A unique field cannot be optional (field: '${name}')`);
      }
    }

    this._scalar = new Scalar(this, scalarType, {
      isOptional: scalarIsOptional,
      validators: scalarValidators
    });
    this._validators = validators;
    this._isArray = isArray;
    this._arrayIsOptional = arrayIsOptional;
    this._default = defaultValue;
    this._isUnique = isUnique;
    this._isActive = false;
    this._value = undefined;
    this._source = undefined;
  }

  fork(parent) {
    const forkedField = super.fork(parent);
    forkedField._scalar = this._scalar.fork(forkedField);
    return forkedField;
  }

  getType() {
    return this._type;
  }

  isArray() {
    return this._isArray;
  }

  isUnique() {
    return this._isUnique;
  }

  isOptional() {
    return this._arrayIsOptional;
  }

  getScalar() {
    return this._scalar;
  }

  isActive() {
    return this._isActive;
  }

  getValue({throwIfInactive = true, forkIfNotOwned = true} = {}) {
    if (!this._isActive) {
      if (throwIfInactive) {
        throw new Error(`Cannot get the value from an inactive field (field: '${this._name}')`);
      }
      return undefined;
    }

    let value = this._value;

    if (value === undefined) {
      return undefined;
    }

    if (!hasOwnProperty(this, '_value') && forkIfNotOwned) {
      value = this._forkValue();
    }

    return value;
  }

  setValue(value, {source} = {}) {
    this.checkValue(value);

    if (canBecomeObservable(value) && !isObservable(value)) {
      value = createObservable(value);
    }

    this._isActive = true;
    this._source = source;

    const previousValue = this._value;

    if (value !== previousValue) {
      this._value = value;

      if (this._isUnique) {
        this._parent.__onUniqueFieldValueChange(this._name, value, previousValue);
      }

      if (isObservable(previousValue)) {
        previousValue.$unobserve(this._parent);
      }

      if (isObservable(value)) {
        value.$observe(this._parent);
      }

      this._parent.$notify();
    }

    return value;
  }

  _forkValue() {
    return mapFromOneOrMany(this._value, value => this._scalar._forkValue(value));
  }

  getValues() {
    const field = this;
    return {
      * [Symbol.iterator]() {
        const value = field.getValue();
        if (value !== undefined) {
          if (field._isArray) {
            for (const item of value) {
              if (item !== undefined) {
                yield item;
              }
            }
          } else {
            yield value;
          }
        }
      }
    };
  }

  checkValue(value) {
    if (value === undefined) {
      return;
    }

    if (this._isArray && !Array.isArray(value)) {
      throw new Error(
        `Type mismatch (field: '${this._name}', expected: 'Array', provided: '${typeof value}')`
      );
    }

    return mapFromOneOrMany(value, value => this._scalar.checkValue(value));
  }

  getSource() {
    return this._source;
  }

  setSource(source) {
    this._source = source;
  }

  createValue(value) {
    return this.setValue(mapFromOneOrMany(value, value => this._scalar.createValue(value)));
  }

  serializeValue({target, fields} = {}) {
    if (target !== undefined) {
      if (target === this._source) {
        return undefined;
      }
    }

    const value = this.getValue();
    return mapFromOneOrMany(value, value => this._scalar.serializeValue(value, {target, fields}));
  }

  deserializeValue(value, {source, fields} = {}) {
    const previousValue = this.isActive() ? this.getValue() : undefined;

    this.setValue(
      mapFromOneOrMany(value, value =>
        this._scalar.deserializeValue(value, {source, fields, previousValue})
      ),
      {source}
    );
  }

  hasValidators() {
    return this._validators.length > 0;
  }

  getFailedValidators({fields} = {}) {
    const value = this.getValue();
    if (this._isArray) {
      const values = value;
      if (values === undefined) {
        if (!this._arrayIsOptional) {
          return [REQUIRED_VALIDATOR_NAME];
        }
        return undefined;
      }
      let failedValidators = runValidators(values, this._validators);
      const failedScalarValidators = values.map(value =>
        this._scalar.getFailedValidators(value, {fields})
      );
      if (!isEmpty(compact(failedScalarValidators))) {
        if (!failedValidators) {
          failedValidators = [];
        }
        failedValidators.push(failedScalarValidators);
      }
      return failedValidators;
    }
    return this._scalar.getFailedValidators(value, {fields});
  }

  getDefaultValue() {
    let value = this._default;
    while (typeof value === 'function') {
      value = value.call(this._parent);
    }
    return value;
  }

  hasDefaultValue() {
    return this._default !== undefined;
  }

  _createFieldMask(fieldMask, {filter, includeReferencedEntities, _typeStack}) {
    if (Array.isArray(fieldMask)) {
      if (!this._isArray) {
        throw new Error(
          `Type mismatch (field: '${this._name}', expected: 'boolean' or 'object', provided: 'array')`
        );
      }
      fieldMask = fieldMask[0];
    }

    return this._scalar._createFieldMask(fieldMask, {
      filter,
      includeReferencedEntities,
      _typeStack
    });
  }

  static isField(object) {
    return isField(object);
  }
}

export function isField(object) {
  return typeof object?.constructor?.isField === 'function';
}

class Scalar {
  constructor(field, type, {isOptional, validators}) {
    this._field = field;
    this._type = type;
    this._isOptional = isOptional;
    this._validators = validators;
  }

  fork(field) {
    const forkedScalar = Object.create(this);
    forkedScalar._field = field;
    return forkedScalar;
  }

  getType() {
    return this._type;
  }

  isOptional() {
    return this._isOptional;
  }

  _forkValue(value) {
    if (value === undefined) {
      return undefined;
    }

    const primitiveType = getPrimitiveType(this._type);
    if (primitiveType) {
      if (primitiveType.fork) {
        return primitiveType.fork(value);
      }
      return value;
    }

    return value.$forkInto(this._field.getLayer());
  }

  checkValue(value) {
    const primitiveType = getPrimitiveType(this._type);
    if (primitiveType) {
      if (!primitiveType.check(value)) {
        throw new Error(
          `Type mismatch (field: '${this._field.getName()}', expected: '${
            this._type
          }', provided: '${typeof value}')`
        );
      }
      return;
    }

    const Model = this.getModel();
    if (!(value instanceof Model)) {
      throw new Error(
        `Type mismatch (field: '${this._field.getName()}', expected: '${this._type}', provided: '${
          value.constructor.name
        }')`
      );
    }
  }

  createValue(value) {
    if (value === undefined) {
      return undefined;
    }

    if (this.isPrimitiveType()) {
      return value;
    }

    if (isPlainObject(value)) {
      const Model = this.getModel();
      return new Model(value);
    }

    return value;
  }

  serializeValue(value, {target, fields}) {
    if (value === undefined) {
      // In case the data is transported via JSON, we will lost all the 'undefined' values.
      // We don't want that because 'undefined' could mean that a field has been deleted.
      // So, we replace all 'undefined' values by 'null'.
      return null;
    }

    const primitiveType = getPrimitiveType(this._type);
    if (primitiveType) {
      if (primitiveType.serialize) {
        return primitiveType.serialize(value);
      }
      return value;
    }

    return value.$serialize({target, fields, _isDeep: true});
  }

  deserializeValue(value, {source, fields, previousValue}) {
    if (value === undefined) {
      throw new Error(`Cannot deserialize 'undefined' (field: '${this._field.getName()}')`);
    }

    if (value === null) {
      return undefined;
    }

    const primitiveType = getPrimitiveType(this._type);
    if (primitiveType) {
      if (primitiveType.deserialize) {
        return primitiveType.deserialize(value);
      }
      return value;
    }

    const type = value._type;
    if (!type) {
      throw new Error(`Cannot determine the type of a value (field: '${this._field.getName()}')`);
    }
    const Model = this._field.getLayer().get(type);
    return Model.$deserialize(value, {source, fields, previousInstance: previousValue});
  }

  hasValidators() {
    return this._validators.length > 0;
  }

  getFailedValidators(value, {fields}) {
    if (value === undefined) {
      if (!this._isOptional) {
        return [REQUIRED_VALIDATOR_NAME];
      }
      return undefined;
    }
    if (this.isPrimitiveType()) {
      return runValidators(value, this._validators);
    }
    return value.$getFailedValidators({fields});
  }

  isPrimitiveType() {
    return getPrimitiveType(this._type) !== undefined;
  }

  getModel() {
    if (this.isPrimitiveType()) {
      return undefined;
    }
    return this._field.getLayer().get(this._type);
  }

  _createFieldMask(fieldMask, {filter, includeReferencedEntities, _typeStack}) {
    const Model = this.getModel();
    if (Model) {
      return Model.prototype.__createFieldMask(fieldMask, {
        filter,
        includeReferencedEntities,
        _typeStack
      });
    }

    ow(fieldMask, 'fields', ow.boolean.true);

    return true;
  }
}

const _primitiveTypes = {
  boolean: {
    check(value) {
      return typeof value === 'boolean';
    }
  },
  number: {
    check(value) {
      return typeof value === 'number';
    }
  },
  string: {
    check(value) {
      return typeof value === 'string';
    }
  },
  object: {
    fork(value) {
      const _fork = object => {
        object = Object.create(this);

        for (const [name, value] of Object.entries(object)) {
          if (Array.isArray(value)) {
            object[name] = value.map(value => _fork(value));
          } else if (value instanceof Date) {
            object[name] = new Date(value);
          } else if (typeof value === 'object' && value !== null) {
            object[name] = _fork(value);
          }
        }

        return object;
      };

      return _fork(value);
    },
    check(value) {
      return isPlainObject(value);
    }
  },
  Date: {
    fork(value) {
      return new Date(value);
    },
    check(value) {
      return value instanceof Date;
    },
    serialize(date) {
      return {_type: 'Date', _value: date.toISOString()};
    },
    deserialize(object) {
      return new Date(object._value);
    }
  }
};

function getPrimitiveType(type) {
  return _primitiveTypes[type];
}
