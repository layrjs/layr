import {getTypeOf} from 'core-helpers';

export type RouteParams = Record<string, RouteParamTypeSpecifier>;

const ROUTE_PARAM_TYPE = ['boolean', 'number', 'string', 'Date'] as const;

export type RouteParamType = typeof ROUTE_PARAM_TYPE[number];

export type RouteParamTypeSpecifier = `${RouteParamType}${'' | '?'}`;

export type RouteParamTypeDescriptor = {
  type: RouteParamType;
  isOptional: boolean;
  specifier: RouteParamTypeSpecifier;
};

export function serializeRouteParam(
  name: string,
  value: any,
  typeDescriptor: RouteParamTypeDescriptor
) {
  const {type, isOptional, specifier} = typeDescriptor;

  if (value === undefined) {
    if (isOptional) {
      return undefined;
    }

    throw new Error(
      `A required route parameter is missing (name: '${name}', type: '${specifier}')`
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
    `Couldn't serialize a route parameter (name: '${name}', value: '${value}', expected type: '${specifier}', received type: '${getTypeOf(
      value
    )}')`
  );
}

export function deserializeRouteParam(
  name: string,
  value: string | undefined,
  typeDescriptor: RouteParamTypeDescriptor
) {
  const {type, isOptional, specifier} = typeDescriptor;

  if (value === undefined) {
    if (isOptional) {
      return undefined;
    }

    throw new Error(
      `A required route parameter is missing (name: '${name}', type: '${specifier}')`
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
    `Couldn't deserialize a route parameter (name: '${name}', value: '${value}', type: '${specifier}')`
  );
}

export function parseRouteParamTypeSpecifier(typeSpecifier: RouteParamTypeSpecifier) {
  let type: RouteParamType;
  let isOptional: boolean;

  if (typeof typeSpecifier !== 'string') {
    throw new Error(
      `Couldn't parse a route parameter type (expected a string, but received a value of type '${getTypeOf(
        typeSpecifier
      )}')`
    );
  }

  if (typeSpecifier.endsWith('?')) {
    type = typeSpecifier.slice(0, -1) as RouteParamType;
    isOptional = true;
  } else {
    type = typeSpecifier as RouteParamType;
    isOptional = false;
  }

  if (type.length === 0) {
    throw new Error("Couldn't parse a route parameter type (received an empty string)");
  }

  if (!ROUTE_PARAM_TYPE.includes(type)) {
    throw new Error(`Couldn't parse a route parameter type ('${type}' is not a supported type)`);
  }

  return {type, isOptional};
}
