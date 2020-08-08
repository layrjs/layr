import {getTypeOf} from 'core-helpers';

import type {
  TraverseAttributesIteratee,
  TraverseAttributesOptions,
  ResolveAttributeSelectorOptions
} from '../../component';
import type {Attribute} from '../attribute';
import type {AttributeSelector} from '../attribute-selector';
import {
  Validator,
  ValidatorFunction,
  IntrospectedValidator,
  runValidators,
  normalizeValidator
} from '../../validation';
import {serialize, SerializeOptions} from '../../serialization';

export type IntrospectedValueType = {
  valueType?: string;
  validators?: IntrospectedValidator[];
  items?: IntrospectedValueType;
};

export type ValueTypeOptions = {
  isOptional?: boolean;
  validators?: (Validator | ValidatorFunction)[];
};

/**
 * A base class that is used internally to handle the various types of values supported by Liaison.
 *
 * #### Usage
 *
 * You shouldn't have to create a `ValueType` instance directly. Instead, when you define an attribute (using a decorator such as [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) or [`@primaryIdentifier()`](https://liaison.dev/docs/v1/reference/component#primary-identifier-decorator)), you can specify a string representing a type of value, and a `ValueType` will be automatically created for you.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {integer, greaterThan} = validators;
 *
 * class Movie extends Component {
 *   // Required 'string' attribute
 *   ﹫attribute('string') title;
 *
 *   // Required 'number' attribute with some validators
 *   ﹫attribute('number', {validators: [integer(), greaterThan(0)]}) reference;
 *
 *   // Optional 'string' attribute
 *   ﹫attribute('string?') summary;
 *
 *   // Required 'Director' attribute
 *   ﹫attribute('Director') director;
 *
 *   // Required array of 'Actor' attribute with a default value
 *   ﹫attribute('Actor[]') actors = [];
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {integer, greaterThan} = validators;
 *
 * class Movie extends Component {
 *   // Required 'string' attribute
 *   ﹫attribute('string') title!: string;
 *
 *   // Required 'number' attribute with some validators
 *   ﹫attribute('number', {validators: [integer(), greaterThan(0)]}) reference!: number;
 *
 *   // Optional 'string' attribute
 *   ﹫attribute('string?') summary?: string;
 *
 *   // Required 'Director' attribute
 *   ﹫attribute('Director') director!: Director;
 *
 *   // Required array of 'Actor' attribute with a default value
 *   ﹫attribute('Actor[]') actors: Actor[] = [];
 * }
 * ```
 *
 * In case you want to access the `ValueType` instances that were created under the hood, you can do the following:
 *
 * ```
 * let valueType = Movie.prototype.getAttribute('title').getValueType();
 * valueType.toString(); // => 'string'
 *
 * valueType = Movie.prototype.getAttribute('reference').getValueType();
 * valueType.toString(); // => 'number'
 * valueType.getValidators(); // => [integerValidator, greaterThanValidator]
 *
 * valueType = Movie.prototype.getAttribute('summary').getValueType();
 * valueType.toString(); // => 'string?'
 * valueType.isOptional(); // => true
 *
 * valueType = Movie.prototype.getAttribute('director').getValueType();
 * valueType.toString(); // => 'Director'
 *
 * valueType = Movie.prototype.getAttribute('actors').getValueType();
 * valueType.toString(); // => 'Actor[]'
 * const itemValueType = valueType.getItemType(); // => A ValueType representing the type of the items inside the array
 * itemValueType.toString(); // => Actor
 * ```
 *
 * #### Supported Types
 *
 * Liaison supports a number of types that can be represented by a string in a way that is very similar to the way you specify basic types in [TypeScript](https://www.typescriptlang.org/).
 *
 * ##### Scalars
 *
 * To specify a scalar type, simply specify a string representing it:
 *
 * * `'boolean'`: A boolean.
 * * `'number'`: A floating-point number.
 * * `'string'`: A string.
 *
 * ##### Arrays
 *
 * To specify an array type, add `'[]'` after any other types:
 *
 * * `'number[]'`: An array of numbers.
 * * `'string[]'`: An array of strings.
 * * `'Actor[]'`: An array of `Actor`.
 * * `'number[][]'`: A matrix of numbers.
 *
 * ##### Objects
 *
 * To specify a plain object type, just specify the string `'object'`:
 *
 * * `'object'`: A plain JavaScript object.
 *
 * Some common JavaScript objects are supported as well:
 *
 * * `'Date'`: A JavaScript `Date` instance.
 * * `'RegExp'`: A JavaScript `RegExp` instance.
 *
 * ##### Components
 *
 * An attribute can hold a reference to a [`Component`](https://liaison.dev/docs/v1/reference/component) instance, or contain an [`EmbeddedComponent`](https://liaison.dev/docs/v1/reference/embedded-component) instance. To specify such a type, just specify the name of the component:
 *
 * * `'Director'`: A reference to a `Director` component instance.
 * * `'MovieDetails'`: A `MovieDetails` embedded component instance.
 *
 * It is also possible to specify a type that represents a reference to a [`Component`](https://liaison.dev/docs/v1/reference/component) class. To do so, add `'typeof '` before the name of the component:
 *
 * * `'typeof Director'`: A reference to the `Director` component class.
 *
 * ##### `'?'` Modifier
 *
 * By default, all attribute values are required, which means a value cannot be `undefined`. To make a value optional, add a question mark (`'?'`) after its type:
 *
 * * `'string?'`: A string or `undefined`.
 * * `'number[]?'`: A number array or `undefined`.
 * * `'number?[]'`: An array containing some values of type number or `undefined`.
 * * `'Director?'`: A reference to a `Director` component instance or `undefined`.
 *
 * ##### '`any`' Type
 *
 * In some rare occasions, you may want to define an attribute that can handle any type of values. To do so, you can specify the string `'any'`:
 *
 * * `'any'`: Any type of values.
 */
export class ValueType {
  _isOptional: boolean | undefined;
  _validators: Validator[];

  constructor(attribute: Attribute, options: ValueTypeOptions = {}) {
    const {isOptional, validators = []} = options;

    const normalizedValidators = validators.map((validator) =>
      normalizeValidator(validator, attribute)
    );

    this._isOptional = isOptional;
    this._validators = normalizedValidators;
  }

  /**
   * Returns whether the value type is marked as optional. A value of a type marked as optional can be `undefined`.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * let valueType = Movie.prototype.getAttribute('title').getValueType();
   * valueType.isOptional(); // => false
   * movie.title = undefined; // Error
   *
   * valueType = Movie.prototype.getAttribute('summary').getValueType();
   * valueType.isOptional(); // => true
   * movie.summary = undefined; // Okay
   * ```
   *
   * @category Methods
   */
  isOptional() {
    return this._isOptional === true;
  }

  /**
   * Returns the validators associated to the value type.
   *
   * @returns A array of [`Validator`](https://liaison.dev/docs/v1/reference/component).
   *
   * @example
   * ```
   * const valueType = Movie.prototype.getAttribute('reference').getValueType();
   * valueType.getValidators(); // => [integerValidator, greaterThanValidator]
   * ```
   *
   * @category Methods
   */
  getValidators() {
    return this._validators;
  }

  /**
   * Returns a string representation of the value type.
   *
   * @returns A string.
   *
   * @example
   * ```
   * let valueType = Movie.prototype.getAttribute('title').getValueType();
   * valueType.toString(); // => 'string'
   *
   * valueType = Movie.prototype.getAttribute('summary').getValueType();
   * valueType.toString(); // => 'string?'
   *
   * valueType = Movie.prototype.getAttribute('actors').getValueType();
   * valueType.toString(); // => 'Actor[]'
   * ```
   *
   * @category Methods
   */
  toString(): string {
    return this.isOptional() ? '?' : '';
  }

  checkValue(value: unknown, attribute: Attribute) {
    if (!this._checkValue(value, attribute)) {
      throw new Error(
        `Cannot assign a value of an unexpected type (${attribute.describe()}, expected type: '${this.toString()}', received type: '${getTypeOf(
          value
        )}')`
      );
    }
  }

  _checkValue(value: unknown, _attribute: Attribute) {
    return value === undefined ? this.isOptional() : undefined;
  }

  _traverseAttributes(
    _iteratee: TraverseAttributesIteratee,
    _attribute: Attribute,
    _value: unknown,
    _options: TraverseAttributesOptions
  ) {
    // NOOP
  }

  _resolveAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    _attribute: Attribute,
    _value: unknown,
    _options: ResolveAttributeSelectorOptions
  ): AttributeSelector {
    return normalizedAttributeSelector !== false;
  }

  isValidValue(value: unknown) {
    const failedValidators = this.runValidators(value);

    return failedValidators.length === 0;
  }

  runValidators(value: unknown, _attributeSelector?: AttributeSelector) {
    const failedValidators = runValidators(this.getValidators(), value, {
      isOptional: this.isOptional()
    });

    const failedValidatorsWithPath = failedValidators.map((failedValidator) => ({
      validator: failedValidator,
      path: ''
    }));

    return failedValidatorsWithPath;
  }

  serializeValue(value: unknown, _attribute: Attribute, options: SerializeOptions = {}) {
    return serialize(value, options);
  }

  introspect() {
    const introspectedValueType: IntrospectedValueType = {valueType: this.toString()};

    const introspectedValidators = this.getValidators().map((validator) => validator.introspect());

    if (introspectedValidators.length > 0) {
      introspectedValueType.validators = introspectedValidators;
    }

    return introspectedValueType;
  }
}
