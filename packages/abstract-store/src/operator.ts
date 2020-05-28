import {getTypeOf} from 'core-helpers';

import type {Query} from './query';

export type Operator = string;

const basicOperators = new Set<Operator>([
  '$equal',
  '$notEqual',
  '$greaterThan',
  '$greaterThanOrEqual',
  '$lessThan',
  '$lessThanOrEqual',
  '$any'
]);

const stringOperators = new Set<Operator>(['$includes', '$startsWith', '$endsWith', '$matches']);

const arrayOperators = new Set<Operator>(['$some', '$every', '$length']);

const logicalOperators = new Set<Operator>(['$not', '$and', '$or', '$nor']);

const aliases = new Map<Operator, Operator>(
  Object.entries({
    $equals: '$equal',
    $notEquals: '$notEqual',
    $greaterThanOrEquals: '$greaterThanOrEqual',
    $lessThanOrEquals: '$lessThanOrEqual',
    $in: '$any',
    $include: '$includes',
    $startWith: '$startsWith',
    $endWith: '$endsWith',
    $match: '$matches',
    $size: '$length'
  })
);

export function looksLikeOperator(string: string): string is Operator {
  return string.startsWith('$');
}

export function normalizeOperatorForValue(
  operator: Operator,
  value: unknown,
  query: Query
): Operator {
  const alias = aliases.get(operator);

  if (alias !== undefined) {
    operator = alias;
  }

  if (basicOperators.has(operator)) {
    return normalizeBasicOperatorForValue(operator, value, query);
  }

  if (stringOperators.has(operator)) {
    return normalizeStringOperatorForValue(operator, value, query);
  }

  if (arrayOperators.has(operator)) {
    return normalizeArrayOperatorForValue(operator, value, query);
  }

  if (logicalOperators.has(operator)) {
    return normalizeLogicalOperatorForValue(operator, value, query);
  }

  throw new Error(
    `A query contains an operator that is not supported (operator: '${operator}', query: '${JSON.stringify(
      query
    )}')`
  );
}

function normalizeBasicOperatorForValue(
  operator: Operator,
  value: unknown,
  query: Query
): Operator {
  if (operator === '$any') {
    if (!Array.isArray(value)) {
      throw new Error(
        `Expected an array as value of the operator '${operator}', but received a value of type '${getTypeOf(
          value
        )}' (query: '${JSON.stringify(query)}')`
      );
    }

    return operator;
  }

  if (typeof value === 'object' && !(value === null || value instanceof Date)) {
    throw new Error(
      `Expected a scalar value of the operator '${operator}', but received a value of type '${getTypeOf(
        value
      )}' (query: '${JSON.stringify(query)}')`
    );
  }

  return operator;
}

function normalizeStringOperatorForValue(
  operator: Operator,
  value: unknown,
  query: Query
): Operator {
  if (operator === '$matches') {
    if (!(value instanceof RegExp)) {
      throw new Error(
        `Expected a regular expression as value of the operator '${operator}', but received a value of type '${getTypeOf(
          value
        )}' (query: '${JSON.stringify(query)}')`
      );
    }

    return operator;
  }

  if (typeof value !== 'string') {
    throw new Error(
      `Expected a string as value of the operator '${operator}', but received a value of type '${getTypeOf(
        value
      )}' (query: '${JSON.stringify(query)}')`
    );
  }

  return operator;
}

function normalizeArrayOperatorForValue(
  operator: Operator,
  value: unknown,
  query: Query
): Operator {
  if (operator === '$length') {
    if (typeof value !== 'number') {
      throw new Error(
        `Expected a number as value of the operator '${operator}', but received a value of type '${getTypeOf(
          value
        )}' (query: '${JSON.stringify(query)}')`
      );
    }

    return operator;
  }

  return operator;
}

function normalizeLogicalOperatorForValue(
  operator: Operator,
  value: unknown,
  query: Query
): Operator {
  if (operator === '$and' || operator === '$or' || operator === '$nor') {
    if (!Array.isArray(value)) {
      throw new Error(
        `Expected an array as value of the operator '${operator}', but received a value of type '${getTypeOf(
          value
        )}' (query: '${JSON.stringify(query)}')`
      );
    }

    return operator;
  }

  return operator;
}
