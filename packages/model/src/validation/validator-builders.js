import {Validator} from './validator';

const validatorFunctions = {
  // Any values

  anyOf: (value, array) => array.includes(value),

  noneOf: (value, array) => !array.includes(value),

  // Numbers

  positive: value => value >= 0,

  negative: value => value < 0,

  lessThan: (value, number) => value < number,

  lessThanOrEqual: (value, number) => value <= number,

  greaterThan: (value, number) => value > number,

  greaterThanOrEqual: (value, number) => value >= number,

  range: (value, [min, max]) => value >= min && value <= max,

  integer: value => Number.isInteger(value),

  // Strings and arrays

  notEmpty: value => value.length > 0,

  minLength: (value, minLength) => value.length >= minLength,

  maxLength: (value, maxLength) => value.length <= maxLength,

  rangeLength: (value, [minLength, maxLength]) =>
    value.length >= minLength && value.length <= maxLength,

  // Strings

  match: (value, pattern) => pattern.test(value)
};

export const validators = {};

for (const [name, func] of Object.entries(validatorFunctions)) {
  validators[name] = (...args) => createValidator(name, func, args);
}

function createValidator(name, func, args) {
  const numberOfRequiredArguments = func.length - 1;
  const validatorArguments = args.slice(0, numberOfRequiredArguments);

  if (validatorArguments.length < numberOfRequiredArguments) {
    throw new Error(
      `A required parameter is missing to build a validator (validator name: '${name}')`
    );
  }

  const [message] = args.slice(numberOfRequiredArguments);

  if (message !== undefined && typeof message !== 'string') {
    throw new Error(
      `When building a validator, the last parameter must be an error message in case of failed validation (validator name: '${name}')`
    );
  }

  return new Validator(func, {name, arguments: validatorArguments, message});
}
