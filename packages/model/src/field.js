import {FieldMask} from './field-mask';
import {isExposed} from '@liaison/layer';
import {createObservable, isObservable, canBecomeObservable} from '@liaison/observable';
import {mapFromOneOrMany} from '@liaison/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import isPlainObject from 'lodash/isPlainObject';
import ow from 'ow';

import {runValidators, normalizeValidator, REQUIRED_VALIDATOR_NAME} from './validation';

export class Field {
  constructor(parent, name, type, options = {}) {
    if (typeof name !== 'string' || !name) {
      throw new Error("'name' field parameter is missing or invalid");
    }

    if (typeof type !== 'string' || !type) {
      throw new Error("'type' field parameter is missing or invalid");
    }

    let {default: defaultValue, validators = [], ...unknownOptions} = options;
    const unknownOption = Object.keys(unknownOptions)[0];
    if (unknownOption) {
      throw new Error(`'${unknownOption}' option is unknown (field: '${name}')`);
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
    this._options = options;

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

    this._scalar = new Scalar(this, scalarType, {
      isOptional: scalarIsOptional,
      validators: scalarValidators
    });
    this._validators = validators;
    this._isArray = isArray;
    this._arrayIsOptional = arrayIsOptional;
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
    return this._parent.$getLayer();
  }

  getParent() {
    return this._parent;
  }

  getName() {
    return this._name;
  }

  getType() {
    return this._type;
  }

  isArray() {
    return this._isArray;
  }

  isOptional() {
    return this._arrayIsOptional;
  }

  getOptions() {
    return this._options;
  }

  getScalar() {
    return this._scalar;
  }

  isActive() {
    return this._isActive;
  }

  isExposed() {
    return isExposed(this._parent, this._name);
  }

  getValue({throwIfInactive = true} = {}) {
    if (!this._isActive) {
      if (throwIfInactive) {
        throw new Error(`Cannot get the value from an inactive field (field: '${this._name}')`);
      }
      return undefined;
    }

    return this._value;
  }

  setValue(value, {source} = {}) {
    this.checkValue(value);

    if (canBecomeObservable(value) && !isObservable(value)) {
      value = createObservable(value);
    }

    const previousValue = this._value;

    this._isActive = true;
    this._value = value;
    this._source = source;

    if (value !== previousValue) {
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

  getValues() {
    const field = this;
    return {
      * [Symbol.iterator]() {
        const value = field.getValue();
        if (value !== undefined) {
          if (field._isArray) {
            for (const item of value) {
              yield item;
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

  deserializeValue(value, {source, fields} = {}) {
    let rootMissingFields;

    const previousValue = this.isActive() ? this.getValue() : undefined;

    this.setValue(
      mapFromOneOrMany(value, value => {
        const {deserializedValue, missingFields} = this._scalar.deserializeValue(value, {
          source,
          fields,
          previousValue
        });

        if (missingFields) {
          rootMissingFields = FieldMask.add(rootMissingFields || new FieldMask(), missingFields);
        }

        return deserializedValue;
      }),
      {source}
    );

    return {missingFields: rootMissingFields};
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

  _createFieldMask(fieldMask, {filter, _typeStack}) {
    if (Array.isArray(fieldMask)) {
      if (!this._isArray) {
        throw new Error(
          `Type mismatch (field: '${this._name}', expected: 'boolean' or 'object', provided: 'array')`
        );
      }
      fieldMask = fieldMask[0];
    }

    return this._scalar._createFieldMask(fieldMask, {filter, _typeStack});
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

  getType() {
    return this._type;
  }

  isOptional() {
    return this._isOptional;
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

    return value.$serialize({target, fields, isDeep: true});
  }

  deserializeValue(value, {source, fields, previousValue}) {
    if (value === undefined) {
      throw new Error(`Cannot deserialize 'undefined' (field: '${this._field.getName()}')`);
    }

    if (value === null) {
      return {deserializedValue: undefined};
    }

    const primitiveType = getPrimitiveType(this._type);
    if (primitiveType) {
      if (primitiveType.deserialize) {
        return {deserializedValue: primitiveType.deserialize(value)};
      }
      return {deserializedValue: value};
    }

    const type = value._type;
    if (!type) {
      throw new Error(`Cannot determine the type of a value (field: '${this._field.getName()}')`);
    }
    const Model = this._field.getLayer().get(type);
    const deserializedValue = Model.$instantiate(value, {previousInstance: previousValue});
    const {missingFields} = deserializedValue.$deserialize(value, {source, fields, isDeep: true});
    return {deserializedValue, missingFields};
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
    return value.$getFailedValidators({fields, isDeep: true});
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

  _createFieldMask(fieldMask, {filter, _typeStack}) {
    const Model = this.getModel();
    if (Model) {
      return Model.prototype.__createFieldMask(fieldMask, {filter, _typeStack});
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
