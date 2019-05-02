import {mapFromOneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';

import {
  createValue,
  serializeValue,
  normalizeValue,
  isPrimitiveType,
  getModel
} from './serialization';
import {runValidators, normalizeValidator, REQUIRED_VALIDATOR_NAME} from './validation';

export class Field {
  constructor(name, type, {default: defaultValue, validators = []} = {}) {
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

  createValue(value, {previousValue, registry, fields, deserialize, source}) {
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
      this.scalar.createValue(value, {
        previousValue,
        registry,
        fields,
        deserialize,
        source,
        fieldName: this.name
      })
    );
  }

  serializeValue(value, options) {
    const result = mapFromOneOrMany(value, value => this.scalar.serializeValue(value, options));
    if (this.isArray && !result?.length) {
      return undefined; // Empty arrays are serialized as 'undefined'
    }
    return result;
  }

  validateValue(value, {filter}) {
    if (this.isArray) {
      const values = value;
      let failedValidators = runValidators(values, this.validators);
      const failedScalarValidators = values.map(value =>
        this.scalar.validateValue(value, {filter})
      );
      if (!isEmpty(compact(failedScalarValidators))) {
        if (!failedValidators) {
          failedValidators = [];
        }
        failedValidators.push(failedScalarValidators);
      }
      return failedValidators;
    }
    return this.scalar.validateValue(value, {filter});
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

  createValue(value, {previousValue, registry, fields, deserialize, source, fieldName}) {
    return createValue(value, {
      expectedType: this.type,
      previousValue,
      registry,
      fields,
      deserialize,
      source,
      fieldName
    });
  }

  serializeValue(value, options) {
    return serializeValue(value, options);
  }

  validateValue(value, {filter}) {
    if (value === undefined) {
      if (!this.isOptional) {
        return [REQUIRED_VALIDATOR_NAME];
      }
      return undefined;
    }
    if (value.isOfType && value.isOfType('Model')) {
      return value.constructor.fieldValueIsSubmodel(value) ?
        value.getFailedValidators({filter}) :
        undefined;
    }
    return runValidators(value, this.validators);
  }

  isPrimitiveType() {
    return isPrimitiveType(this.type);
  }

  getModel(registry) {
    return getModel(registry, this.type);
  }
}
