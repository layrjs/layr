import {Observable, mapFromOneOrMany} from '@liaison/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import isPlainObject from 'lodash/isPlainObject';

import {runValidators, normalizeValidator, REQUIRED_VALIDATOR_NAME} from './validation';

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
    if (!scalarType) {
      throw new Error("'type' parameter is invalid");
    }

    this._scalar = new Scalar(this, scalarType, {
      isOptional: scalarIsOptional,
      validators: scalarValidators
    });
    this._validators = validators;
    this._isArray = isArray;
    this._default = defaultValue;
    this._isActive = false;
    this._value = undefined;
    this._source = undefined;
  }

  fork(parent) {
    const forkedField = Object.create(this);
    forkedField._parent = parent;
    forkedField._scalar = this._scalar.fork(forkedField);
    return forkedField;
  }

  getLayer() {
    return this._parent.getLayer();
  }

  getName() {
    return this._name;
  }

  getType() {
    return this._type;
  }

  getScalar() {
    return this._scalar;
  }

  isActive() {
    return this._isActive;
  }

  getValue() {
    if (!this._isActive) {
      throw new Error(`Cannot get the value from an inactive field (field: '${this._name}')`);
    }
    return this._value;
  }

  setValue(value, {source} = {}) {
    this.checkValue(value);

    if (Observable.canBeObserved(value) && !(value instanceof Observable)) {
      value = new Observable(value);
    }

    const previousValue = this._value;

    this._isActive = true;
    this._value = value;
    this._source = source;

    if (value !== previousValue) {
      if (previousValue instanceof Observable) {
        previousValue.unobserve(this._parent._getNotifier());
      }
      if (value instanceof Observable) {
        value.observe(this._parent._getNotifier());
      }
      this._parent.notify();
    }

    return value;
  }

  getValues() {
    return {
      [Symbol.iterator]: () => {
        const value = this.getValue();
        let values;
        if (this._isArray) {
          values = value;
        } else if (value !== undefined) {
          values = [value];
        } else {
          values = [];
        }
        return values[Symbol.iterator]();
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
    let source = this._source;
    if (!source) {
      source = this.getLayer().getId();
    }
    return source;
  }

  createValue(value) {
    return this.setValue(mapFromOneOrMany(value, value => this._scalar.createValue(value)));
  }

  serializeValue({target, fields} = {}) {
    if (target !== undefined) {
      const source = this.getSource();
      if (target === source) {
        return undefined;
      }
    }

    const value = this.getValue();
    return mapFromOneOrMany(value, value => this._scalar.serializeValue(value, {target, fields}));
  }

  deserializeValue(value, {source} = {}) {
    const previousValue = this.isActive() ? this.getValue() : undefined;
    return this.setValue(
      mapFromOneOrMany(value, value =>
        this._scalar.deserializeValue(value, {
          source,
          previousValue
        })
      ),
      {source}
    );
  }

  getFailedValidators({fields} = {}) {
    const value = this.getValue();
    if (this._isArray) {
      const values = value;
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

    if (value === undefined && this._isArray) {
      return new Observable([]);
    }

    return value;
  }

  _createFieldMask(fieldMask, {filter}) {
    if (Array.isArray(fieldMask)) {
      if (!this._isArray) {
        throw new Error(
          `Type mismatch (field: '${this._name}', expected: 'boolean' or 'object', provided: 'array')`
        );
      }
      fieldMask = fieldMask[0];
    }

    return this._scalar._createFieldMask(fieldMask, {filter});
  }
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

    return value.serialize({target, fields, isDeep: true});
  }

  deserializeValue(value, {source, previousValue}) {
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
    return Model.deserialize(value, {source, previousInstance: previousValue});
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
    return value.getFailedValidators({fields, isDeep: true});
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

  _createFieldMask(fieldMask, {filter}) {
    const Model = this.getModel();
    if (Model) {
      return Model.prototype._createFieldMask(fieldMask, {filter});
    }
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
