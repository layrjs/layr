import isPlainObject from 'lodash/isPlainObject';
import omit from 'lodash/omit';

export function serialize(value, options) {
  let result = serializeValue(value, options);
  if (result !== value) {
    // serializeValue() did the job
    return result;
  }

  if (typeof value !== 'object') {
    // The value is a boolean, a number, or a string
    return value;
  }

  if (Array.isArray(value)) {
    // The value is an array
    return value.map(item => serialize(item, options));
  }

  // The value is a plain object
  result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = serialize(val, options);
  }
  return result;
}

export function deserialize(value, {expectedType, registry} = {}) {
  let result = createValue(value, {expectedType, registry, isDeserializing: true});
  if (result !== value) {
    // createValue() did the job
    return result;
  }

  if (typeof value !== 'object') {
    // The value is a boolean, a number, or a string
    return value;
  }

  if (Array.isArray(value)) {
    // The value is an array
    return value.map(item => deserialize(item, {expectedType, registry}));
  }

  // The value is a plain object
  result = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = deserialize(val, {expectedType, registry});
  }
  return result;
}

export function createValue(value, {expectedType, registry, isDeserializing, fieldName} = {}) {
  value = normalizeValue(value, {fieldName});

  if (value === undefined) {
    return undefined;
  }

  const type = typeof value === 'object' ? value._type : undefined;
  if (type) {
    value = omit(value, '_type');
    const builtInType = builtInTypes[type];
    if (builtInType) {
      value = value._value;
      if (builtInType.deserialize) {
        value = builtInType.deserialize(value);
      }
    } else {
      const Model = getModel(registry, type);
      value = new Model(value, {isDeserializing});
    }
  }

  if (!expectedType) {
    return value;
  }

  const builtInType = builtInTypes[expectedType];
  if (builtInType) {
    if (!builtInType.checkType(value)) {
      throw new Error(
        `Type mismatch (field: '${fieldName}', expected: '${expectedType}', provided: '${typeof value}')`
      );
    }
    return value;
  }

  if (value.isOfType && value.isOfType('Model')) {
    if (!value.isOfType(expectedType)) {
      throw new Error(
        `Type mismatch (field: '${fieldName}', expected: '${expectedType}', provided: '${value.constructor.getName()}')`
      );
    }
    return value;
  }

  if (typeof value !== 'object') {
    throw new Error(
      `Type mismatch (field: '${fieldName}', expected: 'object', provided: '${typeof value}')`
    );
  }

  const Model = getModel(registry, expectedType);
  value = new Model(value, {isDeserializing});
  return value;
}

export function serializeValue(value, options) {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return {_type: 'Date', _value: value.toISOString()};
  }

  if (value.isOfType && value.isOfType('Model')) {
    return value.serialize(options);
  }

  return value;
}

export function normalizeValue(value, {fieldName}) {
  if (value === null) {
    throw new Error(`The 'null' value is not allowed (field: '${fieldName}')`);
  }

  return value;
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
    deserialize(value) {
      return new Date(value);
    }
  }
};

function getModel(registry, name) {
  const Model = registry?.[name];
  if (Model === undefined) {
    throw new Error(`Model not found (name: '${name}')`);
  }
  return Model;
}
