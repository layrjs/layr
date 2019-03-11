import isPlainObject from 'lodash/isPlainObject';

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
    if (options.default !== undefined) {
      this.default = options.default;
    }
    if (options.serializedName !== undefined) {
      this.serializedName = options.serializedName;
    }
  }

  serialize(value) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const builtInType = builtInTypes[this.type];
    if (builtInType) {
      if (builtInType.serialize) {
        value = {_type: this.type, _value: builtInType.serialize(value)};
      }
      return value;
    }

    if (value.serialize) {
      return value.serialize();
    }

    if (value.toJSON) {
      return value.toJSON();
    }

    const name = value.constructor?.getName ? value.constructor.getName() : value.constructor?.name;
    throw new Error(`Couldn't find a serializer (model: '${name}')`);
  }

  deserialize(value, parent, options) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
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
          `Type mismatch (field: '${this.name}', expected type: '${
            this.type
          }', provided type: '${typeof value}')`
        );
      }
      return value;
    }

    const Model = parent.constructor._getModel(this.type);
    return new Model(value, options);
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
