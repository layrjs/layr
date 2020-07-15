import {Component} from '../component';
import {Attribute} from '../properties';
import {Validator, isValidatorInstance} from './validator';
import {validators} from './validator-builders';
import {normalizeValidator} from './utilities';

describe('Utilities', () => {
  test('Normalization', async () => {
    class TestComponent extends Component {}

    const attribute = new Attribute('testAttribute', TestComponent.prototype);

    let validator: any = new Validator((value) => value > 0);
    let normalizedValidator = normalizeValidator(validator, attribute);

    expect(normalizedValidator).toBe(validator);

    validator = validators.notEmpty();
    normalizedValidator = normalizeValidator(validator, attribute);

    expect(normalizedValidator).toBe(validator);

    validator = validators.notEmpty;

    expect(() => normalizeValidator(validator, attribute)).toThrow(
      "The specified validator is a validator builder that has not been called (attribute: 'TestComponent.prototype.testAttribute')"
    );

    validator = (value: number) => value > 0;
    normalizedValidator = normalizeValidator(validator, attribute);

    expect(isValidatorInstance(normalizedValidator));
    expect(normalizedValidator.getName()).toBe('validator');
    expect(normalizedValidator.getFunction()).toBe(validator);
    expect(normalizedValidator.getArguments()).toEqual([]);
    expect(normalizedValidator.getMessage()).toBe('The validator `validator()` failed');
  });
});
