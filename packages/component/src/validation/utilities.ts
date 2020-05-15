import {validators, ValidatorBuilder} from './validator-builders';
import {Validator, ValidatorFunction, isValidatorInstance} from './validator';
import type {Attribute} from '../attribute';

export function normalizeValidator(validator: Validator | ValidatorFunction, attribute: Attribute) {
  if (isValidatorInstance(validator)) {
    return validator;
  }

  if (typeof validator !== 'function') {
    throw new Error(`The specified validator is not a function (${attribute.describe()})`);
  }

  if (Object.values(validators).includes((validator as unknown) as ValidatorBuilder)) {
    throw new Error(
      `The specified validator is a validator builder that has not been called (${attribute.describe()})`
    );
  }

  return new Validator(validator);
}
