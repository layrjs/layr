import {hasOwnProperty, getFunctionName} from 'core-helpers';

export type ValidatorFunction = (value: any, ...args: any[]) => boolean;

type ValidatorOptions = {
  name?: string;
  arguments?: any[];
  message?: string;
};

export type IntrospectedValidator = {
  name: string;
  function: ValidatorFunction;
  arguments?: any[];
  message: string;
};

/**
 * A class to handle the validation of the component attributes.
 *
 * #### Usage
 *
 * You shouldn't have to create a `Validator` instance directly. Instead, when you define an attribute (using a decorator such as [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator)), you can invoke some [built-in validator builders](https://liaison.dev/docs/v1/reference/validator#built-in-validator-builders) or specify your own [custom validation functions](https://liaison.dev/docs/v1/reference/validator#custom-validation-functions) that will be automatically transformed into `Validator` instances.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {notEmpty, maxLength, integer, greaterThan} = validators;
 *
 * class Movie extends Component {
 *   // An attribute of type 'string' that cannot be empty or exceed 30 characters
 *   ﹫attribute('string', {validators: [notEmpty(), maxLength(30)]}) title;
 *
 *   // An attribute of type 'number' that must an integer greater than 0
 *   ﹫attribute('number', {validators: [integer(), greaterThan(0)]}) reference;
 *
 *   // An array attribute that can contain up to 5 non-empty strings
 *   ﹫attribute('string[]', {validators: [maxLength(5)], items: {validators: [notEmpty()]}})
 *   tags = [];
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {notEmpty, maxLength, integer, greaterThan} = validators;
 *
 * class Movie extends Component {
 *   // An attribute of type 'string' that cannot be empty or exceed 30 characters
 *   ﹫attribute('string', {validators: [notEmpty(), maxLength(30)]}) title!: string;
 *
 *   // An attribute of type 'number' that must an integer greater than 0
 *   ﹫attribute('number', {validators: [integer(), greaterThan(0)]}) reference!: number;
 *
 *   // An array attribute that can contain up to 5 non-empty strings
 *   ﹫attribute('string[]', {validators: [maxLength(5)], items: {validators: [notEmpty()]}})
 *   tags: string[] = [];
 * }
 * ```
 *
 * In case you want to access the `Validator` instances that were created under the hood, you can do the following:
 *
 * ```
 * const movie = new Movie({ ... });
 *
 * movie.getAttribute('title').getValueType().getValidators();
 * // => [notEmptyValidator, maxLengthValidator]
 *
 * movie.getAttribute('reference').getValueType().getValidators();
 * // => [integerValidator, greaterThanValidator]
 *
 * movie.getAttribute('tags').getValueType().getValidators();
 * // => [maxLengthValidator]
 *
 * movie.getAttribute('tags').getValueType().getItemType().getValidators();
 * // => [notEmptyValidator]
 * ```
 *
 * #### Built-In Validator Builders
 *
 * Liaison provides a number of validator builders that can be used when you define your component attributes. See an [example of use](https://liaison.dev/docs/v1/reference/validator#usage) above.
 *
 * ##### Numbers
 *
 * The following validator builders can be used to validate numbers:
 *
 * * `integer()`: Ensures that a number is an integer.
 * * `positive()`: Ensures that a number is greater than or equal to 0.
 * * `negative()`: Ensures that a number is less than 0.
 * * `lessThan(value)`: Ensures that a number is less than the specified value.
 * * `lessThanOrEqual(value)`: Ensures that a number is less than or equal to the specified value.
 * * `greaterThan(value)`: Ensures that a number is greater than the specified value.
 * * `greaterThanOrEqual(value)`: Ensures that a number is greater than or equal to the specified value.
 * * `range([min, max])`: Ensures that a number is in the specified inclusive range.
 * * `anyOf(arrayOfNumbers)`: Ensures that a number is any of the specified numbers.
 * * `noneOf(arrayOfNumbers)`: Ensures that a number is none of the specified numbers.
 *
 * ##### Strings
 *
 * The following validator builders can be used to validate strings:
 *
 * * `notEmpty()`: Ensures that a string is not empty.
 * * `minLength(value)`: Ensures that a string has at least the specified number of characters.
 * * `maxLength(value)`: Ensures that a string doesn't exceed the specified number of characters.
 * * `rangeLength([min, max])`: Ensures that the length of a string is in the specified inclusive range.
 * * `match(regExp)`: Ensures that a string matches the specified [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).
 * * `anyOf(arrayOfStrings)`: Ensures that a string is any of the specified strings.
 * * `noneOf(arrayOfStrings)`: Ensures that a string is none of the specified strings.
 *
 * ##### Arrays
 *
 * The following validator builders can be used to validate arrays:
 *
 * * `notEmpty()`: Ensures that an array is not empty.
 * * `minLength(value)`: Ensures that an array has at least the specified number of items.
 * * `maxLength(value)`: Ensures that an array doesn't exceed the specified number of items.
 * * `rangeLength([min, max])`: Ensures that the length of an array is in the specified inclusive range.
 *
 * ##### Any Type
 *
 * The following validator builder can be used to validate any type of values:
 *
 * * `required()`: Ensures that a value is not undefined.
 *
 * ##### Custom Failed Validation Message
 *
 * You can pass an additional parameter to all the built-in validators builder to customize the message of the error that is thrown in case of failed validation.
 *
 * **Example:**
 *
 * ```
 * maxLength(16, 'A username cannot exceed 16 characters');
 * ```
 *
 * #### Custom Validation Functions
 *
 * In addition to the [built-in validator builders](https://liaison.dev/docs/v1/reference/validator#built-in-validator-builders), you can validate your component attributes with your own custom validation functions.
 *
 * A custom validation function takes a value as first parameter and returns a boolean indicating whether the validation has succeeded or not.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component, attribute} from '﹫liaison/component';
 *
 * class OddNumber extends Component {
 *   // Ensures that the value is an odd number
 *   ﹫attribute('number', {validators: [(value) => value % 2 === 1]}) value;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, attribute} from '﹫liaison/component';
 *
 * class OddNumber extends Component {
 *   // Ensures that the value is an odd number
 *   ﹫attribute('number', {validators: [(value) => value % 2 === 1]}) value!: number;
 * }
 * ```
 */
export class Validator {
  _function: ValidatorFunction;
  _name: string;
  _arguments: any[];
  _message: string;

  constructor(func: ValidatorFunction, options: ValidatorOptions = {}) {
    let {name, arguments: args = [], message} = options;

    if (name === undefined) {
      name = getFunctionName(func) || 'anonymous';
    }

    if (message === undefined) {
      const signature = `${name}(${stringifyArguments(args)})`;
      message = `The validator \`${signature}\` failed`;
    }

    this._function = func;
    this._name = name;
    this._arguments = args;
    this._message = message;
  }

  /**
   * Returns the function associated to the validator.
   *
   * @returns A function.
   *
   * @example
   * ```
   * maxLength(8).getFunction();
   * // => function (value, maxLength) { return value.length <= maxLength; }
   * ```
   *
   * @category Methods
   */
  getFunction() {
    return this._function;
  }

  /**
   * Returns the name of the validator.
   *
   * @returns A string.
   *
   * @example
   * ```
   * maxLength(8).getName(); // => 'maxLength'
   * ```
   *
   * @category Methods
   */
  getName() {
    return this._name;
  }

  /**
   * Returns the arguments of the validator.
   *
   * @returns An array of values of any type.
   *
   * @example
   * ```
   * maxLength(8).getArguments(); // => [8]
   * ```
   *
   * @category Methods
   */
  getArguments() {
    return this._arguments;
  }

  /**
   * Returns the message of the error that is thrown in case of failed validation.
   *
   * @returns A string.
   *
   * @example
   * ```
   * maxLength(8).getMessage(); // => 'The validator maxLength(8) failed'
   * ```
   *
   * @category Methods
   */
  getMessage() {
    return this._message;
  }

  /**
   * Runs the validator against the specified value.
   *
   * @returns `true` if the validation has succeeded, `false` otherwise.
   *
   * @example
   * ```
   * maxLength(8).run('1234567'); // => true
   * maxLength(8).run('12345678'); // => true
   * maxLength(8).run('123456789'); // => false
   * ```
   *
   * @category Methods
   */
  run(value: any) {
    return this.getFunction()(value, ...this.getArguments());
  }

  introspect() {
    const introspectedValidator: Partial<IntrospectedValidator> = {
      name: this.getName(),
      function: this.getFunction()
    };

    const args = this.getArguments();

    if (args.length > 0) {
      introspectedValidator.arguments = args;
    }

    introspectedValidator.message = this.getMessage();

    return introspectedValidator as IntrospectedValidator;
  }

  static unintrospect(introspectedValidator: IntrospectedValidator) {
    return {...introspectedValidator};
  }

  static isValidator(value: any): value is Validator {
    return isValidatorInstance(value);
  }
}

export function isValidatorInstance(value: any): value is Validator {
  return typeof value?.constructor?.isValidator === 'function';
}

export function isSerializedValidator(object: object) {
  return object !== undefined && hasOwnProperty(object, '__validator');
}

export function required(value: any) {
  return value !== undefined;
}

export const requiredValidator = new Validator(required);

export function runValidators(
  validators: Validator[],
  value: any,
  options: {isOptional?: boolean} = {}
) {
  const {isOptional = false} = options;

  if (value === undefined) {
    return isOptional ? [] : [requiredValidator];
  }

  const failedValidators: Validator[] = [];

  for (const validator of validators) {
    if (!validator.run(value)) {
      failedValidators.push(validator);
    }
  }

  return failedValidators;
}

function stringifyArguments(args: any[]) {
  let string = JSON.stringify(args, (_key, value) => {
    if (value instanceof RegExp) {
      return `__regExp(${value.toString()})regExp__`;
    }

    return value;
  });

  // Fix the RegExp
  string = string.replace(/"__regExp\(/g, '');
  string = string.replace(/\)regExp__"/g, '');

  // Remove the array brackets
  string = string.slice(1, -1);

  return string;
}
