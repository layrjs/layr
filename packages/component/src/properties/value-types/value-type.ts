import {getTypeOf} from 'core-helpers';

import type {
  TraverseAttributesIteratee,
  TraverseAttributesOptions,
  ResolveAttributeSelectorOptions
} from '../../component';
import type {Attribute} from '../attribute';
import type {AttributeSelector} from '../attribute-selector';
import {Sanitizer, SanitizerFunction, runSanitizers, normalizeSanitizer} from '../../sanitization';
import {Validator, ValidatorFunction, runValidators, normalizeValidator} from '../../validation';
import {serialize, SerializeOptions} from '../../serialization';

export type IntrospectedValueType = {
  valueType?: string;
  validators?: Validator[];
  items?: IntrospectedValueType;
};

export type ValueTypeOptions = {
  isOptional?: boolean;
  sanitizers?: (Sanitizer | SanitizerFunction)[];
  validators?: (Validator | ValidatorFunction)[];
};

/**
 * A class to handle the various types of values supported by Layr.
 *
 * #### Usage
 *
 * You shouldn't have to create a `ValueType` instance directly. Instead, when you define an attribute (using a decorator such as [`@attribute()`](https://layrjs.com/docs/v1/reference/component#attribute-decorator)), you can specify a string representing a type of value, and a `ValueType` will be automatically created for you.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component, attribute, validators} from '﹫layr/component';
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
 * import {Component, attribute, validators} from '﹫layr/component';
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
 * const movie = new Movie({ ... });
 *
 * let valueType = movie.getAttribute('title').getValueType();
 * valueType.toString(); // => 'string'
 *
 * valueType = movie.getAttribute('reference').getValueType();
 * valueType.toString(); // => 'number'
 * valueType.getValidators(); // => [integerValidator, greaterThanValidator]
 *
 * valueType = movie.getAttribute('summary').getValueType();
 * valueType.toString(); // => 'string?'
 * valueType.isOptional(); // => true
 *
 * valueType = movie.getAttribute('director').getValueType();
 * valueType.toString(); // => 'Director'
 *
 * valueType = movie.getAttribute('actors').getValueType();
 * valueType.toString(); // => 'Actor[]'
 * const itemValueType = valueType.getItemType(); // => A ValueType representing the type of the items inside the array
 * itemValueType.toString(); // => Actor
 * ```
 *
 * #### Supported Types
 *
 * Layr supports a number of types that can be represented by a string in a way that is very similar to the way you specify basic types in [TypeScript](https://www.typescriptlang.org/).
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
 * To specify an array type, add `'[]'` after any other type:
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
 * An attribute can hold a reference to a [`Component`](https://layrjs.com/docs/v1/reference/component) instance, or contain an [`EmbeddedComponent`](https://layrjs.com/docs/v1/reference/embedded-component) instance. To specify such a type, just specify the name of the component:
 *
 * * `'Director'`: A reference to a `Director` component instance.
 * * `'MovieDetails'`: A `MovieDetails` embedded component instance.
 *
 * It is also possible to specify a type that represents a reference to a [`Component`](https://layrjs.com/docs/v1/reference/component) class. To do so, add `'typeof '` before the name of the component:
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
  _sanitizers: Sanitizer[];
  _validators: Validator[];

  constructor(attribute: Attribute, options: ValueTypeOptions = {}) {
    const {isOptional, sanitizers = [], validators = []} = options;

    const normalizedSanitizers = sanitizers.map((sanitizer) =>
      normalizeSanitizer(sanitizer, attribute)
    );

    const normalizedValidators = validators.map((validator) =>
      normalizeValidator(validator, attribute)
    );

    this._isOptional = isOptional;
    this._sanitizers = normalizedSanitizers;
    this._validators = normalizedValidators;
  }

  /**
   * Returns whether the value type is marked as optional. A value of a type marked as optional can be `undefined`.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.getAttribute('summary').getValueType().isOptional(); // => true
   * movie.summary = undefined; // Okay
   *
   * movie.getAttribute('title').getValueType().isOptional(); // => false
   * movie.title = undefined; // Error
   * ```
   *
   * @category Methods
   */
  isOptional() {
    return this._isOptional === true;
  }

  getSanitizers() {
    return this._sanitizers;
  }

  /**
   * Returns the validators associated to the value type.
   *
   * @returns A array of [`Validator`](https://layrjs.com/docs/v1/reference/component).
   *
   * @example
   * ```
   * movie.getAttribute('reference').getValueType().getValidators();
   * // => [integerValidator, greaterThanValidator]
   * ```
   *
   * @category Methods
   */
  getValidators() {
    return this._validators;
  }

  /**
   * @method getItemType
   *
   * In case the value type is an array, returns the value type of the items it contains.
   *
   * @returns A [ValueType](https://layrjs.com/docs/v1/reference/value-type).
   *
   * @example
   * ```
   * movie.getAttribute('actors').getValueType().getItemType().toString(); // => 'Actor'
   * ```
   *
   * @category Methods
   */

  /**
   * Returns a string representation of the value type.
   *
   * @returns A string.
   *
   * @example
   * ```
   * movie.getAttribute('title').getValueType().toString(); // => 'string'
   * movie.getAttribute('summary').getValueType().toString(); // => 'string?'
   * movie.getAttribute('actors').getValueType().toString(); // => 'Actor[]'
   * ```
   *
   * @category Methods
   */
  toString(): string {
    return this.isOptional() ? '?' : '';
  }

  getScalarType() {
    return this as ValueType;
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

  sanitizeValue(value: any) {
    return runSanitizers(this.getSanitizers(), value);
  }

  isValidValue(value: unknown) {
    const failedValidators = this.runValidators(value);

    return failedValidators.length === 0;
  }

  runValidators(value: unknown, _attributeSelector?: AttributeSelector) {
    const failedValidators = runValidators(this.getValidators(), value);

    const failedValidatorsWithPath = failedValidators.map((failedValidator) => ({
      validator: failedValidator,
      path: ''
    }));

    return failedValidatorsWithPath;
  }

  serializeValue(value: unknown, _attribute: Attribute, options: SerializeOptions = {}) {
    return serialize(value, options);
  }

  canDeserializeInPlace(_attribute: Attribute) {
    return false;
  }

  introspect() {
    const introspectedValueType: IntrospectedValueType = {valueType: this.toString()};

    const validators = this.getValidators();

    if (validators.length > 0) {
      introspectedValueType.validators = validators;
    }

    return introspectedValueType;
  }
}
