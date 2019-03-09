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
  }

  cast(value, parent, options) {
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
        if (builtInType.create) {
          value = builtInType.create(value);
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
    create(value) {
      return new Date(value);
    }
  }
};
