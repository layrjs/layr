import isPlainObject from 'lodash/isPlainObject';
import {mapFromOneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';

import {runValidators, normalizeValidator, REQUIRED_VALIDATOR_NAME} from './validation';

export class Field {
  constructor(name, type, {default: defaultValue, validators = [], serializedName} = {}) {
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

    this.name = name;
    this.serializedName = serializedName || name;
    this.type = type;

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

    this.scalar = new Scalar(scalarType, {
      isOptional: scalarIsOptional,
      validators: scalarValidators
    });
    this.validators = validators;
    this.isArray = isArray;

    if (defaultValue !== undefined) {
      this.default = defaultValue;
    }
  }

  createValue(value, parent, {isDeserializing}) {
    value = normalizeValue(value, {fieldName: this.name});

    if (value === undefined) {
      return undefined;
    }

    if (this.isArray && !Array.isArray(value)) {
      throw new Error(
        `Type mismatch (field: '${this.name}', expected: 'Array', provided: '${typeof value}')`
      );
    }

    return mapFromOneOrMany(value, value =>
      this.scalar.createValue(value, parent, {fieldName: this.name, isDeserializing})
    );
  }

  serializeValue(value, {filter, _level}) {
    return mapFromOneOrMany(value, value => this.scalar.serializeValue(value, {filter, _level}));
  }

  validateValue(value) {
    if (this.isArray) {
      const values = value;
      let failedValidators = runValidators(values, this.validators);
      const failedScalarValidators = values.map(value => this.scalar.validateValue(value));
      if (!isEmpty(compact(failedScalarValidators))) {
        if (!failedValidators) {
          failedValidators = [];
        }
        failedValidators.push(failedScalarValidators);
      }
      return failedValidators;
    }
    return this.scalar.validateValue(value);
  }
}

class Scalar {
  constructor(type, {isOptional, validators}) {
    if (typeof type !== 'string' || !type) {
      throw new Error("'type' parameter is missing or invalid");
    }
    this.type = type;
    this.isOptional = isOptional;
    this.validators = validators;
  }

  createValue(value, parent, {fieldName, isDeserializing}) {
    value = normalizeValue(value, {fieldName});

    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'object' && value._type !== undefined) {
      const builtInType = builtInTypes[value._type];
      if (builtInType) {
        value = value._value;
        if (builtInType.deserialize) {
          value = builtInType.deserialize(value);
        }
      }
    }

    const builtInType = builtInTypes[this.type];
    if (builtInType) {
      if (!builtInType.checkType(value)) {
        throw new Error(
          `Type mismatch (field: '${fieldName}', expected: '${
            this.type
          }', provided: '${typeof value}')`
        );
      }
      return value;
    }

    const Model = parent.constructor._getModel(this.type);
    return new Model(value, {isDeserializing});
  }

  serializeValue(value, {filter, _level}) {
    if (value === undefined) {
      return {_type: 'undefined'};
    }

    const builtInType = builtInTypes[this.type];
    if (builtInType) {
      if (builtInType.serialize) {
        value = {_type: this.type, _value: builtInType.serialize(value)};
      }
      return value;
    }

    if (value.isOfType && value.isOfType('Model')) {
      return value.serialize({filter, _level: _level + 1});
    }

    if (value.toJSON) {
      return value.toJSON();
    }

    const name = value.constructor?.getName ? value.constructor.getName() : value.constructor?.name;
    throw new Error(`Couldn't find a serializer (model: '${name}')`);
  }

  validateValue(value) {
    if (value === undefined) {
      if (!this.isOptional) {
        return [REQUIRED_VALIDATOR_NAME];
      }
      return undefined;
    }
    if (value.isOfType && value.isOfType('Model')) {
      return value.constructor.fieldValueIsSubmodel(value) ?
        value.getFailedValidators() :
        undefined;
    }
    return runValidators(value, this.validators);
  }
}

const builtInTypes = {
  boolean: {
    checkType(value) {
      return typeof value === 'boolean';
    }
  },
  number: {
    checkType(value) {
      return typeof value === 'number';
    }
  },
  string: {
    checkType(value) {
      return typeof value === 'string';
    }
  },
  object: {
    checkType(value) {
      return isPlainObject(value);
    }
  },
  Date: {
    checkType(value) {
      return value instanceof Date;
    },
    serialize(value) {
      return value.toISOString();
    },
    deserialize(value) {
      return new Date(value);
    }
  }
};

function normalizeValue(value, {fieldName}) {
  if (value === null) {
    throw new Error(`The 'null' value is not allowed (field: '${fieldName}')`);
  }

  if (value === undefined || (typeof value === 'object' && value._type === 'undefined')) {
    return undefined;
  }

  return value;
}
