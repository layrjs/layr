import {getTypeOf} from 'core-helpers';

export type Params = Record<string, TypeSpecifier>;

const PARAM_TYPE = ['boolean', 'number', 'string', 'Date'] as const;

export type ParamType = typeof PARAM_TYPE[number];

export type TypeSpecifier = `${ParamType}${'' | '?'}`;

export type ParamTypeDescriptor = {
  type: ParamType;
  isOptional: boolean;
  specifier: TypeSpecifier;
};

export function serializeParam(name: string, value: any, typeDescriptor: ParamTypeDescriptor) {
  const {type, isOptional, specifier} = typeDescriptor;

  if (value === undefined) {
    if (isOptional) {
      return undefined;
    }

    throw new Error(
      `A required route (or wrapper) parameter is missing (name: '${name}', type: '${specifier}')`
    );
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
  }

  if (type === 'number') {
    if (typeof value === 'number' && !isNaN(value)) {
      return String(value);
    }
  }

  if (type === 'string') {
    if (typeof value === 'string') {
      return value;
    }
  }

  if (type === 'Date') {
    if (value instanceof Date && !isNaN(value.valueOf())) {
      return value.toISOString();
    }
  }

  throw new Error(
    `Couldn't serialize a route (or wrapper) parameter (name: '${name}', value: '${value}', expected type: '${specifier}', received type: '${getTypeOf(
      value
    )}')`
  );
}

export function deserializeParam(
  name: string,
  value: string | undefined,
  typeDescriptor: ParamTypeDescriptor
) {
  const {type, isOptional, specifier} = typeDescriptor;

  if (value === undefined) {
    if (isOptional) {
      return undefined;
    }

    throw new Error(
      `A required route (or wrapper) parameter is missing (name: '${name}', type: '${specifier}')`
    );
  }

  if (type === 'boolean') {
    if (value === '0') {
      return false;
    }

    if (value === '1') {
      return true;
    }
  }

  if (type === 'number') {
    const result = Number(value);

    if (!isNaN(result)) {
      return result;
    }
  }

  if (type === 'string') {
    return value;
  }

  if (type === 'Date') {
    const result = new Date(value);

    if (!isNaN(result.valueOf())) {
      return result;
    }
  }

  throw new Error(
    `Couldn't deserialize a route (or wrapper) parameter (name: '${name}', value: '${value}', type: '${specifier}')`
  );
}

export function parseParamTypeSpecifier(typeSpecifier: TypeSpecifier) {
  let type: ParamType;
  let isOptional: boolean;

  if (typeof typeSpecifier !== 'string') {
    throw new Error(
      `Couldn't parse a route (or wrapper) parameter type (expected a string, but received a value of type '${getTypeOf(
        typeSpecifier
      )}')`
    );
  }

  if (typeSpecifier.endsWith('?')) {
    type = typeSpecifier.slice(0, -1) as ParamType;
    isOptional = true;
  } else {
    type = typeSpecifier as ParamType;
    isOptional = false;
  }

  if (type.length === 0) {
    throw new Error(
      "Couldn't parse a route (or wrapper) parameter type (received an empty string)"
    );
  }

  if (!PARAM_TYPE.includes(type)) {
    throw new Error(
      `Couldn't parse a route (or wrapper) parameter type ('${type}' is not a supported type)`
    );
  }

  return {type, isOptional};
}
