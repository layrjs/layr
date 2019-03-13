import isPlainObject from 'lodash/isPlainObject';
import {mapFromOneOrMany} from '@superstore/util';

export class Field {
  constructor(name, type, options = {}) {
    if (typeof name !== 'string' || !name) {
      throw new Error("'name' parameter is missing or invalid");
    }
    if (typeof type !== 'string' || !type) {
      throw new Error("'type' parameter is missing or invalid");
    }

    this.name = name;
    this.type = type;

    const isArray = type.endsWith('[]');
    if (isArray) {
      this.scalar = new Scalar(type.slice(0, -2));
      this.isArray = isArray;
    } else {
      this.scalar = new Scalar(type);
    }

    if (options.default !== undefined) {
      this.default = options.default;
    }
    if (options.serializedName !== undefined) {
      this.serializedName = options.serializedName;
    }
    if (options.isOwned !== undefined) {
      this.isOwned = options.isOwned;
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

  serializeValue(value, {filter}) {
    return mapFromOneOrMany(value, value => this.scalar.serializeValue(value, {filter}));
  }
}

class Scalar {
  constructor(type) {
    if (typeof type !== 'string' || !type) {
      throw new Error("'type' parameter is missing or invalid");
    }
    this.type = type;
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

  serializeValue(value, {filter}) {
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
      return value.serialize({filter});
    }

    if (value.toJSON) {
      return value.toJSON();
    }

    const name = value.constructor?.getName ? value.constructor.getName() : value.constructor?.name;
    throw new Error(`Couldn't find a serializer (model: '${name}')`);
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
