import {mapFromOneOrMany} from '@storable/util';
import isEmpty from 'lodash/isEmpty';
import compact from 'lodash/compact';
import isPlainObject from 'lodash/isPlainObject';

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

  checkValue(parent, value) {
    if (value === undefined) {
      return;
    }

    if (this.isArray && !Array.isArray(value)) {
      throw new Error(
        `Type mismatch (field: '${this.name}', expected: 'Array', provided: '${typeof value}')`
      );
    }

    return mapFromOneOrMany(value, value =>
      this.scalar.checkValue(parent, value, {fieldName: this.name})
    );
  }

  createValue(parent, value, {fields}) {
    if (value === undefined) {
      return undefined;
    }
    return mapFromOneOrMany(value, value =>
      this.scalar.createValue(parent, value, {fields, fieldName: this.name})
    );
  }

  serializeValue(parent, value, options) {
    const result = mapFromOneOrMany(value, value =>
      this.scalar.serializeValue(parent, value, options)
    );
    // if (this.isArray && !result?.length) {
    //   return undefined; // Empty arrays are serialized as 'undefined'
    // }
    return result;
  }

  deserializeValue(parent, value, {source, previousValue}) {
    return mapFromOneOrMany(value, value =>
      this.scalar.deserializeValue(parent, value, {source, previousValue, fieldName: this.name})
    );
  }

  validateValue(value, {fieldFilter}) {
    if (this.isArray) {
      const values = value;
      let failedValidators = runValidators(values, this.validators);
      const failedScalarValidators = values.map(value =>
        this.scalar.validateValue(value, {fieldFilter})
      );
      if (!isEmpty(compact(failedScalarValidators))) {
        if (!failedValidators) {
          failedValidators = [];
        }
        failedValidators.push(failedScalarValidators);
      }
      return failedValidators;
    }
    return this.scalar.validateValue(value, {fieldFilter});
  }

  getDefaultValue(parent) {
    let value = this.default;

    while (typeof value === 'function') {
      value = value.call(parent);
    }

    if (value === undefined && this.isArray) {
      return [];
    }

    return value;
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

  checkValue(parent, value, {fieldName}) {
    const primitiveType = getPrimitiveType(this.type);
    if (primitiveType) {
      if (!primitiveType.check(value)) {
        throw new Error(
          `Type mismatch (field: '${fieldName}', expected: '${
            this.type
          }', provided: '${typeof value}')`
        );
      }
      return;
    }

    const Model = parent.constructor.getRegistry().get(this.type);
    if (!(value instanceof Model)) {
      throw new Error(
        `Type mismatch (field: '${fieldName}', expected: '${this.type}', provided: '${
          value.constructor.name
        }')`
      );
    }
  }

  createValue(parent, value, {fields}) {
    if (value === undefined) {
      return undefined;
    }

    const primitiveType = getPrimitiveType(this.type);
    if (primitiveType) {
      return value;
    }

    const Model = parent.constructor.getRegistry().get(this.type);
    return new Model(value, {fields});
  }

  serializeValue(parent, value, options) {
    if (value === undefined) {
      // In case the data is transported via JSON, we will lost all the 'undefined' values.
      // We don't want that because 'undefined' might mean that a field has been deleted.
      // So, we replace all 'undefined' values by 'null'.
      return null;
    }

    const primitiveType = getPrimitiveType(this.type);
    if (primitiveType) {
      if (primitiveType.serialize) {
        return primitiveType.serialize(value);
      }
      return value;
    }

    return value.serialize(options);
  }

  deserializeValue(parent, value, {source, previousValue, fieldName}) {
    if (value === undefined) {
      throw new Error(`Cannot deserialize 'undefined' (field: '${fieldName}')`);
    }

    if (value === null) {
      return undefined;
    }

    const primitiveType = getPrimitiveType(this.type);
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
    const Model = parent.constructor.getRegistry().get(type);
    return Model.deserialize(value, {source, previousInstance: previousValue});
  }

  validateValue(value, {fieldFilter}) {
    if (value === undefined) {
      if (!this.isOptional) {
        return [REQUIRED_VALIDATOR_NAME];
      }
      return undefined;
    }
    if (value.isOfType && value.isOfType('Model')) {
      return value.constructor.fieldValueIsSubmodel(value) ?
        value.getFailedValidators({fieldFilter}) :
        undefined;
    }
    return runValidators(value, this.validators);
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
