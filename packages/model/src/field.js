import {mapFromOneOrMany} from '@layr/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import isPlainObject from 'lodash/isPlainObject';

import {runValidators, normalizeValidator, REQUIRED_VALIDATOR_NAME} from './validation';

// TODO: Pass 'layer' so we can get rid of 'parent'

export class Field {
  constructor(parent, name, type, {default: defaultValue, validators = []} = {}) {
    if (typeof name !== 'string' || !name) {
      throw new Error("'name' parameter is missing or invalid");
    }
    if (typeof type !== 'string' || !type) {
      throw new Error("'type' parameter is missing or invalid");
    }

    if (!Array.isArray(validators)) {
      throw new Error(`'validators' option must be an array (field: '${name}')`);
    }
    validators = validators.map(validator =>
      mapFromOneOrMany(validator, validator => normalizeValidator(validator, {fieldName: name}))
    );

    this._parent = parent;
    this._name = name;
    this._type = type;

    let scalarType;
    let scalarIsOptional;
    let scalarValidators;
    const isArray = type.endsWith('[]');

    if (isArray) {
      if (type.includes('?')) {
        throw new Error(`An array type cannot be optional (field: '${name}')`);
      }
      scalarType = type.slice(0, -2);
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
      if (scalarType.endsWith('?')) {
        scalarIsOptional = true;
        scalarType = scalarType.slice(0, -1);
      }
    }

    this._scalar = new Scalar(scalarType, {
      isOptional: scalarIsOptional,
      validators: scalarValidators
    });
    this._validators = validators;
    this._isArray = isArray;
    this._default = defaultValue;
    this._value = undefined;
    this._source = undefined;
  }

  fork(parent) {
    const forkedField = Object.create(this);
    forkedField._parent = parent;
    return forkedField;
  }

  getName() {
    return this._name;
  }

  getType() {
    return this._type;
  }

  getValue() {
    return this._value;
  }

  setValue(value, {source} = {}) {
    this.checkValue(value);
    this._value = value;
    this._source = source;
    return value;
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

    return mapFromOneOrMany(value, value =>
      this._scalar.checkValue(this._parent, value, {fieldName: this._name})
    );
  }

  getSource() {
    let source = this._source;
    if (!source) {
      source = this._parent.constructor.getLayer().getName();
    }
    return source;
  }

  createValue(value) {
    // TODO: Don't call setValue()
    return this.setValue(
      mapFromOneOrMany(value, value =>
        this._scalar.createValue(this._parent, value, {fieldName: this._name})
      )
    );
  }

  serializeValue({target, fieldMask, fieldFilter} = {}) {
    if (target !== undefined) {
      const source = this.getSource();
      if (target === source) {
        return undefined;
      }
    }

    const value = this.getValue();
    return mapFromOneOrMany(value, value =>
      this._scalar.serializeValue(this._parent, value, {target, fieldMask, fieldFilter})
    );
  }

  deserializeValue(value, {source, previousValue} = {}) {
    return this.setValue(
      mapFromOneOrMany(value, value =>
        this._scalar.deserializeValue(this._parent, value, {
          source,
          previousValue,
          fieldName: this._name
        })
      ),
      {source}
    );
  }

  validateValue({fieldMask, fieldFilter} = {}) {
    const value = this.getValue();
    if (this._isArray) {
      const values = value;
      let failedValidators = runValidators(values, this._validators);
      const failedScalarValidators = values.map(value =>
        this._scalar.validateValue(this._parent, value, {fieldMask, fieldFilter})
      );
      if (!isEmpty(compact(failedScalarValidators))) {
        if (!failedValidators) {
          failedValidators = [];
        }
        failedValidators.push(failedScalarValidators);
      }
      return failedValidators;
    }
    return this._scalar.validateValue(this._parent, value, {fieldMask, fieldFilter});
  }

  getDefaultValue() {
    let value = this._default;

    while (typeof value === 'function') {
      value = value.call(this._parent);
    }

    if (value === undefined && this._isArray) {
      return [];
    }

    return value;
  }

  normalizeFieldMask(fieldMask) {
    return this._scalar.normalizeFieldMask(this._parent, fieldMask);
  }
}

class Scalar {
  constructor(type, {isOptional, validators}) {
    if (typeof type !== 'string' || !type) {
      throw new Error("'type' parameter is missing or invalid");
    }
    this._type = type;
    this._isOptional = isOptional;
    this._validators = validators;
  }

  checkValue(parent, value, {fieldName}) {
    const primitiveType = getPrimitiveType(this._type);
    if (primitiveType) {
      if (!primitiveType.check(value)) {
        throw new Error(
          `Type mismatch (field: '${fieldName}', expected: '${
            this._type
          }', provided: '${typeof value}')`
        );
      }
      return;
    }

    const Model = parent.constructor.getLayer().get(this._type);
    if (!(value instanceof Model)) {
      throw new Error(
        `Type mismatch (field: '${fieldName}', expected: '${this._type}', provided: '${
          value.constructor.name
        }')`
      );
    }
  }

  createValue(parent, value) {
    if (value === undefined) {
      return undefined;
    }

    if (this.isPrimitiveType()) {
      return value;
    }

    if (isPlainObject(value)) {
      const Model = parent.constructor.getLayer().get(this._type);
      return new Model(value);
    }

    return value;
  }

  serializeValue(parent, value, {target, fieldMask, fieldFilter}) {
    if (value === undefined) {
      // In case the data is transported via JSON, we will lost all the 'undefined' values.
      // We don't want that because 'undefined' might mean that a field has been deleted.
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

    return value._serialize({target, fieldMask, fieldFilter});
  }

  deserializeValue(parent, value, {source, previousValue, fieldName}) {
    if (value === undefined) {
      throw new Error(`Cannot deserialize 'undefined' (field: '${fieldName}')`);
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
      throw new Error(`Cannot determine the type of a value (field: '${fieldName}')`);
    }
    const Model = parent.constructor.getLayer().get(type);
    return Model.deserialize(value, {source, previousInstance: previousValue});
  }

  validateValue(parent, value, {fieldMask, fieldFilter}) {
    if (value === undefined) {
      if (!this._isOptional) {
        return [REQUIRED_VALIDATOR_NAME];
      }
      return undefined;
    }
    if (this.isPrimitiveType()) {
      return runValidators(value, this._validators);
    }
    return value._getFailedValidators({fieldMask, fieldFilter});
  }

  normalizeFieldMask(parent, fieldMask) {
    if (this.isPrimitiveType()) {
      return true;
    }
    const Model = parent.constructor.getLayer().get(this._type);
    return Model._normalizeFieldMask(fieldMask);
  }

  isPrimitiveType() {
    return getPrimitiveType(this._type) !== undefined;
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
    check(value) {
      return isPlainObject(value);
    }
  },
  Date: {
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
