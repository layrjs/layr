import {isValidatorInstance} from './validator';
import {validators} from './validator-builders';

describe('Validator builders', () => {
  test('Building validators', async () => {
    let validator = validators.notEmpty();

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('notEmpty');
    expect(typeof validator.getFunction()).toBe('function');
    expect(validator.getArguments()).toEqual([]);
    expect(validator.getMessage()).toBe('The validator `notEmpty()` failed');

    validator = validators.minLength(5);

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('minLength');
    expect(typeof validator.getFunction()).toBe('function');
    expect(validator.getArguments()).toEqual([5]);
    expect(validator.getMessage()).toBe('The validator `minLength(5)` failed');

    validator = validators.minLength(5, 'The minimum length is 5');

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('minLength');
    expect(typeof validator.getFunction()).toBe('function');
    expect(validator.getArguments()).toEqual([5]);
    expect(validator.getMessage()).toBe('The minimum length is 5');

    validator = validators.anyOf([1, 2, 3]);

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('anyOf');
    expect(typeof validator.getFunction()).toBe('function');
    expect(validator.getArguments()).toEqual([[1, 2, 3]]);
    expect(validator.getMessage()).toBe('The validator `anyOf([1,2,3])` failed');

    expect(() => validators.minLength()).toThrow(
      "A required parameter is missing to build the validator 'minLength'"
    );

    expect(() => validators.minLength(5, 10)).toThrow(
      "When building a validator, if an extra parameter is specified, it must be a string representing the failed validation message (validator: 'minLength')"
    );
  });

  test('Running built-in validators', async () => {
    expect(validators.anyOf([1, 2, 3]).run(1)).toBe(true);
    expect(validators.anyOf([1, 2, 3]).run(5)).toBe(false);

    expect(validators.positive().run(1)).toBe(true);
    expect(validators.positive().run(-1)).toBe(false);

    expect(validators.lessThan(5).run(3)).toBe(true);
    expect(validators.lessThan(5).run(7)).toBe(false);

    expect(validators.range([5, 10]).run(7)).toBe(true);
    expect(validators.range([5, 10]).run(3)).toBe(false);

    expect(validators.notEmpty().run('abc')).toBe(true);
    expect(validators.notEmpty().run('')).toBe(false);
    expect(validators.notEmpty().run([1])).toBe(true);
    expect(validators.notEmpty().run([])).toBe(false);

    expect(validators.maxLength(3).run('abc')).toBe(true);
    expect(validators.maxLength(3).run('abcd')).toBe(false);
    expect(validators.maxLength(3).run([1, 2, 3])).toBe(true);
    expect(validators.maxLength(3).run([1, 2, 3, 4])).toBe(false);

    expect(validators.match(/b/).run('abc')).toBe(true);
    expect(validators.match(/e/).run('abc')).toBe(false);
  });
});
