import {
  Validator,
  isValidator,
  runValidators,
  requiredValidator,
  validators,
  normalizeValidator
} from '../../..';

describe('Validation', () => {
  describe('Validator', () => {
    test('Creation', async () => {
      const notEmpty = value => value.length > 0;
      let validator = new Validator(notEmpty);

      expect(isValidator(validator));
      expect(validator.getName()).toBe('notEmpty');
      expect(validator.getFunction()).toBe(notEmpty);
      expect(validator.getArguments()).toEqual([]);
      expect(validator.getMessage()).toBe('The validator `notEmpty()` failed');

      const greaterThan = (value, number) => value > number;
      validator = new Validator(greaterThan, {arguments: [5]});

      expect(isValidator(validator));
      expect(validator.getName()).toBe('greaterThan');
      expect(validator.getFunction()).toBe(greaterThan);
      expect(validator.getArguments()).toEqual([5]);
      expect(validator.getMessage()).toBe('The validator `greaterThan(5)` failed');

      const match = (value, pattern) => pattern.test(value);
      const regExp = /abc/gi;
      validator = new Validator(match, {arguments: [regExp]});

      expect(isValidator(validator));
      expect(validator.getName()).toBe('match');
      expect(validator.getFunction()).toBe(match);
      expect(validator.getArguments()).toEqual([regExp]);
      expect(validator.getMessage()).toBe('The validator `match(/abc/gi)` failed');

      const validatorFunction = (value, number) => value < number;

      validator = new Validator(validatorFunction, {
        name: 'lessThanOrEqual5',
        message: 'The maximum value is 5'
      });

      expect(isValidator(validator));
      expect(validator.getName()).toBe('lessThanOrEqual5');
      expect(validator.getFunction()).toBe(validatorFunction);
      expect(validator.getArguments()).toEqual([]);
      expect(validator.getMessage()).toBe('The maximum value is 5');
    });

    test('Execution', async () => {
      const validatorFunction = (value, number) => value > number;

      const validator = new Validator(validatorFunction, {
        name: 'greaterThan',
        arguments: [5],
        message: 'The value is not greater than 5'
      });

      expect(validator.run(7)).toBe(true);
      expect(validator.run(3)).toBe(false);

      expect(runValidators([validator], 7)).toEqual([]);
      expect(runValidators([validator], 3)).toEqual([validator]);

      expect(runValidators([validator], undefined)).toEqual([requiredValidator]);
      expect(runValidators([validator], undefined, {isOptional: true})).toEqual([]);
    });

    test('Serialization', async () => {
      const validatorFunction = (value, number) => value > number;

      const validator = new Validator(validatorFunction, {
        name: 'greaterThan',
        arguments: [5],
        message: 'The value is not greater than 5'
      });

      expect(validator.serialize()).toStrictEqual({
        __validator: '(value, number) => value > number',
        name: 'greaterThan',
        arguments: [5],
        message: 'The value is not greater than 5'
      });
    });

    test('Deserialization', async () => {
      const validator = Validator.deserialize({
        __validator: '(value, number) => value > number',
        name: 'greaterThan',
        arguments: [5],
        message: 'The value is not greater than 5'
      });

      expect(isValidator(validator));
      expect(validator.getName()).toBe('greaterThan');
      expect(typeof validator.getFunction()).toBe('function');
      expect(validator.getFunction().toString()).toBe('(value, number) => value > number');
      expect(validator.getArguments()).toEqual([5]);
      expect(validator.getMessage()).toBe('The value is not greater than 5');
    });
  });

  describe('Validator builders', () => {
    test('Building validators', async () => {
      let validator = validators.notEmpty();

      expect(isValidator(validator));
      expect(validator.getName()).toBe('notEmpty');
      expect(typeof validator.getFunction()).toBe('function');
      expect(validator.getArguments()).toEqual([]);
      expect(validator.getMessage()).toBe('The validator `notEmpty()` failed');

      validator = validators.minLength(5);

      expect(isValidator(validator));
      expect(validator.getName()).toBe('minLength');
      expect(typeof validator.getFunction()).toBe('function');
      expect(validator.getArguments()).toEqual([5]);
      expect(validator.getMessage()).toBe('The validator `minLength(5)` failed');

      validator = validators.minLength(5, 'The minimum length is 5');

      expect(isValidator(validator));
      expect(validator.getName()).toBe('minLength');
      expect(typeof validator.getFunction()).toBe('function');
      expect(validator.getArguments()).toEqual([5]);
      expect(validator.getMessage()).toBe('The minimum length is 5');

      validator = validators.anyOf([1, 2, 3]);

      expect(isValidator(validator));
      expect(validator.getName()).toBe('anyOf');
      expect(typeof validator.getFunction()).toBe('function');
      expect(validator.getArguments()).toEqual([[1, 2, 3]]);
      expect(validator.getMessage()).toBe('The validator `anyOf([1,2,3])` failed');

      expect(() => validators.minLength()).toThrow(
        "A required parameter is missing to build a validator (validator name: 'minLength')"
      );

      expect(() => validators.minLength(5, 10)).toThrow(
        "When building a validator, the last parameter must be an error message in case of failed validation (validator name: 'minLength')"
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

  describe('Utilities', () => {
    test('Normalization', async () => {
      class Field {
        getName() {
          return 'field';
        }
      }

      const field = new Field();

      let validator = new Validator(value => value > 0);
      let normalizedValidator = normalizeValidator(validator, {field});

      expect(normalizedValidator).toBe(validator);

      validator = validators.notEmpty();
      normalizedValidator = normalizeValidator(validator, {field});

      expect(normalizedValidator).toBe(validator);

      validator = validators.notEmpty;

      expect(() => normalizeValidator(validator, {field})).toThrow(
        "The specified validator is a validator builder that has not been called (field name: 'field')"
      );

      validator = value => value > 0;
      normalizedValidator = normalizeValidator(validator, {field});

      expect(isValidator(normalizedValidator));
      expect(normalizedValidator.getName()).toBe('validator');
      expect(normalizedValidator.getFunction()).toBe(validator);
      expect(normalizedValidator.getArguments()).toEqual([]);
      expect(normalizedValidator.getMessage()).toBe('The validator `validator()` failed');
    });
  });
});
