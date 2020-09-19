import {Validator, isValidatorInstance, runValidators} from './validator';

describe('Validator', () => {
  test('Creation', async () => {
    const notEmpty = (value: string | any[]) => value.length > 0;
    let validator = new Validator(notEmpty);

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('notEmpty');
    expect(validator.getFunction()).toBe(notEmpty);
    expect(validator.getArguments()).toEqual([]);
    expect(validator.getMessage()).toBe('The validator `notEmpty()` failed');

    const greaterThan = (value: number, number: number) => value > number;
    validator = new Validator(greaterThan, {arguments: [5]});

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('greaterThan');
    expect(validator.getFunction()).toBe(greaterThan);
    expect(validator.getArguments()).toEqual([5]);
    expect(validator.getMessage()).toBe('The validator `greaterThan(5)` failed');

    const match = (value: string, pattern: RegExp) => pattern.test(value);
    const regExp = /abc/gi;
    validator = new Validator(match, {arguments: [regExp]});

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('match');
    expect(validator.getFunction()).toBe(match);
    expect(validator.getArguments()).toEqual([regExp]);
    expect(validator.getMessage()).toBe('The validator `match(/abc/gi)` failed');

    const validatorFunction = (value: number, number: number) => value < number;

    validator = new Validator(validatorFunction, {
      name: 'lessThanOrEqual5',
      message: 'The maximum value is 5'
    });

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('lessThanOrEqual5');
    expect(validator.getFunction()).toBe(validatorFunction);
    expect(validator.getArguments()).toEqual([]);
    expect(validator.getMessage()).toBe('The maximum value is 5');
  });

  test('Execution', async () => {
    const validatorFunction = (value: number, number: number) => value > number;

    const validator = new Validator(validatorFunction, {
      name: 'greaterThan',
      arguments: [5],
      message: 'The value is not greater than 5'
    });

    expect(validator.run(7)).toBe(true);
    expect(validator.run(3)).toBe(false);

    expect(runValidators([validator], 7)).toEqual([]);
    expect(runValidators([validator], 3)).toEqual([validator]);
  });

  test('Introspection', async () => {
    const validatorFunction = (value: number, number: number) => value > number;

    const validator = new Validator(validatorFunction, {
      name: 'greaterThan',
      arguments: [5],
      message: 'The value is not greater than 5'
    });

    expect(validator.introspect()).toStrictEqual({
      name: 'greaterThan',
      function: validatorFunction,
      arguments: [5],
      message: 'The value is not greater than 5'
    });
  });
});
