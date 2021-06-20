import {Validator, isValidatorInstance, runValidators} from './validator';
import {serialize} from '../serialization';
import {deserialize} from '../deserialization';

describe('Validator', () => {
  test('Creation', async () => {
    const notEmpty = (value: string | any[]) => value.length > 0;
    let validator = new Validator(notEmpty);

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('notEmpty');
    expect(validator.getFunction()).toBe(notEmpty);
    expect(validator.getArguments()).toEqual([]);
    expect(validator.getMessage()).toBe('The validator `notEmpty()` failed');
    expect(validator.getMessage({generateIfMissing: false})).toBeUndefined();

    const greaterThan = (value: number, number: number) => value > number;
    validator = new Validator(greaterThan, {arguments: [5]});

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('greaterThan');
    expect(validator.getFunction()).toBe(greaterThan);
    expect(validator.getArguments()).toEqual([5]);
    expect(validator.getMessage()).toBe('The validator `greaterThan(5)` failed');
    expect(validator.getMessage({generateIfMissing: false})).toBeUndefined();

    const match = (value: string, pattern: RegExp) => pattern.test(value);
    const regExp = /abc/gi;
    validator = new Validator(match, {arguments: [regExp]});

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('match');
    expect(validator.getFunction()).toBe(match);
    expect(validator.getArguments()).toEqual([regExp]);
    expect(validator.getMessage()).toBe('The validator `match(/abc/gi)` failed');
    expect(validator.getMessage({generateIfMissing: false})).toBeUndefined();

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
    expect(validator.getMessage({generateIfMissing: false})).toBe('The maximum value is 5');
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

  test('Serialization', async () => {
    const greaterThan = (value: number, number: number) => value > number;

    const greaterThanValidator = new Validator(greaterThan, {
      name: 'greaterThan',
      arguments: [5],
      message: 'The value is not greater than 5'
    });

    const serializedGreaterThanValidator = greaterThanValidator.serialize(serialize);

    expect(serializedGreaterThanValidator).toStrictEqual({
      __validator: {
        name: 'greaterThan',
        function: {__function: '(value, number) => value > number'},
        arguments: [5],
        message: 'The value is not greater than 5'
      }
    });

    const optional = (value: any, validator: Validator) =>
      value === undefined || validator.run(value);

    const optionalValidator = new Validator(optional, {
      name: 'optional',
      arguments: [greaterThanValidator]
    });

    const serializedOptionalValidator = optionalValidator.serialize(serialize);

    expect(serializedOptionalValidator).toStrictEqual({
      __validator: {
        name: 'optional',
        function: {__function: '(value, validator) => value === undefined || validator.run(value)'},
        arguments: [serializedGreaterThanValidator]
      }
    });
  });

  test('Deserialization', async () => {
    const validator = Validator.recreate(
      {
        __validator: {
          name: 'optional',
          function: {
            __function: '(value, validator) => value === undefined || validator.run(value)'
          },
          arguments: [
            {
              __validator: {
                name: 'greaterThan',
                function: {__function: '(value, number) => value > number'},
                arguments: [5],
                message: 'The value is not greater than 5'
              }
            }
          ]
        }
      },
      deserialize
    );

    expect(isValidatorInstance(validator));
    expect(validator.getName()).toBe('optional');
    expect(typeof validator.getFunction()).toBe('function');
    expect(validator.getArguments().length).toBe(1);
    expect(validator.getArguments()[0].getName()).toBe('greaterThan');
    expect(typeof validator.getArguments()[0].getFunction()).toBe('function');
    expect(validator.getArguments()[0].getArguments()).toEqual([5]);
    expect(validator.getArguments()[0].getMessage()).toBe('The value is not greater than 5');
    expect(validator.getMessage()).toBe('The validator `optional(greaterThan(5))` failed');
  });
});
