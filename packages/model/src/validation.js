import fnName from 'fn-name';

export const REQUIRED_VALIDATOR_NAME = 'required()';

const _validators = {
  // Any values

  anyOf: (value, array) => array.includes(value),

  // Numbers

  positive: value => value >= 0,

  negative: value => value < 0,

  lessThan: (value, number) => value < number,

  lessThanOrEqual: (value, number) => value <= number,

  greaterThan: (value, number) => value > number,

  greaterThanOrEqual: (value, number) => value >= number,

  integer: value => Number.isInteger(value),

  // Strings and Arrays

  notEmpty: value => value.length > 0,

  minLength: (value, length) => value.length >= length,

  maxLength: (value, length) => value.length <= length,

  // Strings

  match: (value, pattern) => pattern.test(value)
};

export const validators = {};
for (const [name, func] of Object.entries(_validators)) {
  validators[name] = (...args) => createValidator(name, func, ...args);
}

export function createValidator(name, func, ...args) {
  const validator = value => func(value, ...args);
  validator.displayName = `${name}(${JSON.stringify(args).slice(1, -1)})`;
  return validator;
}

export function runValidators(value, validators) {
  let failedValidators;
  for (const validator of validators) {
    if (!validator(value)) {
      if (!failedValidators) {
        failedValidators = [];
      }
      failedValidators.push(fnName(validator));
    }
  }
  return failedValidators;
}

export function normalizeValidator(validator, {fieldName}) {
  if (typeof validator !== 'function') {
    throw new Error(`A validator must be a function (field: '${fieldName}')`);
  }
  // Ensure that validator builders are called
  if (Object.values(validators).includes(validator)) {
    validator = validator();
  }
  return validator;
}
