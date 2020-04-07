import {getTypeOf} from '@liaison/component';

const basicOperators = new Set([
  '$equal',
  '$notEqual',
  '$greaterThan',
  '$greaterThanOrEqual',
  '$lessThan',
  '$lessThanOrEqual'
]);

const stringOperators = new Set(['$includes', '$startsWith', '$endsWith', '$matches']);

const arrayOperators = new Set(['$some']);

const aliases = new Map(
  Object.entries({
    $equals: '$equal',
    $notEquals: '$notEqual',
    $greaterThanOrEquals: '$greaterThanOrEqual',
    $lessThanOrEquals: '$lessThanOrEqual',
    $include: '$includes',
    $startWith: '$startsWith',
    $endWith: '$endsWith',
    $match: '$matches'
  })
);

export function looksLikeOperator(string) {
  return string.startsWith('$');
}

export function normalizeOperatorForValue(operator, value, {query}) {
  const alias = aliases.get(operator);

  if (alias !== undefined) {
    operator = alias;
  }

  if (basicOperators.has(operator)) {
    return normalizeBasicOperatorForValue(operator, value, {query});
  }

  if (stringOperators.has(operator)) {
    return normalizeStringOperatorForValue(operator, value, {query});
  }

  if (arrayOperators.has(operator)) {
    return normalizeArrayOperatorForValue(operator, value, {query});
  }

  throw new Error(
    `A query contains an operator that is not supported (operator: '${operator}', query: '${JSON.stringify(
      query
    )}')`
  );
}

function normalizeBasicOperatorForValue(operator, value, {query}) {
  if (typeof value === 'object' && !(value === null || value instanceof Date)) {
    throw new Error(
      `Expected a scalar value of the operator '${operator}', but received a value of type '${getTypeOf(
        value
      )}' (query: '${JSON.stringify(query)}')`
    );
  }

  return operator;
}

function normalizeStringOperatorForValue(operator, value, {query}) {
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

function normalizeArrayOperatorForValue(operator, _value, {_query}) {
  return operator;
}
