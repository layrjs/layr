import {hasOwnProperty} from 'core-helpers';
import {
  Observable,
  createObservable,
  isObservable,
  canBeObserved,
  isEmbeddable,
  ObserverPayload
} from '@liaison/observable';

import type {
  Component,
  TraverseAttributesIteratee,
  TraverseAttributesOptions,
  ResolveAttributeSelectorOptions
} from '../component';
import {Property, PropertyOptions, IntrospectedProperty, UnintrospectedProperty} from './property';
import {
  ValueType,
  IntrospectedValueType,
  UnintrospectedValueType,
  createValueType,
  unintrospectValueType
} from './value-types';
import {fork} from '../forking';
import {AttributeSelector} from './attribute-selector';
import type {Validator, ValidatorFunction} from '../validation';
import {SerializeOptions} from '../serialization';
import {isComponentClass, isComponentInstance, ensureComponentClass} from '../utilities';

export type AttributeOptions = PropertyOptions & {
  valueType?: string;
  value?: unknown;
  default?: unknown;
  validators?: (Validator | ValidatorFunction)[];
  items?: AttributeItemsOptions;
  getter?: (this: any) => unknown;
  setter?: (this: any, value: any) => void;
};

type AttributeItemsOptions = {
  validators?: (Validator | ValidatorFunction)[];
  items?: AttributeItemsOptions;
};

export type IntrospectedAttribute = IntrospectedProperty & {
  value?: unknown;
  default?: unknown;
} & IntrospectedValueType;

export type UnintrospectedAttribute = UnintrospectedProperty & {
  options: {
    value?: unknown;
    default?: unknown;
  } & UnintrospectedValueType;
};

/**
 * *Inherits from [`Property`](https://liaison.dev/docs/v1/reference/property) and [`Observable`](https://liaison.dev/docs/v1/reference/observable).*
 *
 * An `Attribute` represents an attribute of a [Component](https://liaison.dev/docs/v1/reference/component) class, prototype, or instance. It plays the role of a regular JavaScript object attribute, but brings some extra features such as type checking at runtime, validation, or serialization.
 *
 * Typically, you create an attribute and associate it to a component using the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.
 *
 * For example, here is how you would define a `Movie` class with some attributes:
 *
 * ```
 * // JS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {minLength} = validators;
 *
 * class Movie extends Component {
 *   // Optional 'string' class attribute
 *   ﹫attribute('string?') static customName;
 *
 *   // Required 'string' instance attribute
 *   ﹫attribute('string') title;
 *
 *   // Optional 'string' instance attribute with a validator and a default value
 *   ﹫attribute('string?', {validators: [minLength(16)]}) summary = '';
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {minLength} = validators;
 *
 * class Movie extends Component {
 *   // Optional 'string' class attribute
 *   ﹫attribute('string?') static customName?: string;
 *
 *   // Required 'string' instance attribute
 *   ﹫attribute('string') title!: string;
 *
 *   // Optional 'string' instance attribute with a validator and a default value
 *   ﹫attribute('string?', {validators: [minLength(16)]}) summary? = '';
 * }
 * ```
 *
 * Then you can access the attributes like you would normally do with regular JavaScript objects:
 *
 * ```
 * Movie.customName = 'Film';
 * Movie.customName; // => 'Film'
 *
 * const movie = new Movie({title: 'Inception'});
 * movie.title; // => 'Inception'
 * movie.title = 'Inception 2';
 * movie.title; // => 'Inception 2'
 * movie.summary; // => '' (default value)
 * ```
 *
 * And you can take profit of some extra features:
 *
 * ```
 * // Type checking at runtime
 * movie.title = 123; // Error
 * movie.title = undefined; // Error
 *
 * // Validation
 * movie.summary = undefined;
 * movie.isValid(); // => true (movie.summary is optional)
 * movie.summary = 'A nice movie.';
 * movie.isValid(); // => false (movie.summary is too short)
 * movie.summary = 'An awesome movie.'
 * movie.isValid(); // => true
 *
 * // Serialization
 * movie.serialize();
 * // => {__component: 'Movie', title: 'Inception 2', summary: 'An awesome movie.'}
 * ```
 */
export class Attribute extends Observable(Property) {
  /**
   * Creates an instance of [`Attribute`](https://liaison.dev/docs/v1/reference/attribute). Typically, instead of using this constructor, you would rather use the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The component class, prototype, or instance that owns the attribute.
   * @param [options.valueType] A string specifying the [type of values](https://liaison.dev/docs/v1/reference/value-type) the attribute can store.
   * @param [options.value] The initial value of a class attribute.
   * @param [options.defaultValue] The default value (or a function returning the default value) of an instance attribute.
   * @param [options.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validation) for the value of the attribute.
   * @param [options.items.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validation) for the items of an array attribute.
   * @param [options.getter] A getter function for getting the value of the attribute. Plays the same role as a regular [JavaScript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get).
   * @param [options.setter] A setter function for setting the value of the attribute. Plays the same role as a regular [JavaScript setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set).
   * @param [options.exposure] A [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.
   *
   * @returns The [`Attribute`](https://liaison.dev/docs/v1/reference/attribute) instance that was created.
   *
   * @example
   * ```
   * import {Component, Attribute} from '﹫liaison/component';
   *
   * class Movie extends Component {}
   *
   * const title = new Attribute('title', Movie.prototype, {valueType: 'string'});
   *
   * title.getName(); // => 'title'
   * title.getParent(); // => Movie.prototype
   * title.getValueType().toString(); // => 'string'
   * ```
   *
   * @category Creation
   */
  constructor(name: string, parent: typeof Component | Component, options: AttributeOptions = {}) {
    super(name, parent, options);
  }

  _initialize() {
    this.addObserver(this._onChange.bind(this));
  }

  // === Options ===

  _getter?: () => unknown;
  _setter?: (value: any) => void;

  setOptions(options: AttributeOptions = {}) {
    const {
      valueType,
      value: initialValue,
      default: defaultValue,
      validators,
      items,
      getter,
      setter,
      ...otherOptions
    } = options;

    const hasInitialValue = 'value' in options;
    const hasDefaultValue = 'default' in options;

    super.setOptions(otherOptions);

    this._valueType = createValueType(valueType, this, {validators, items});

    if (getter !== undefined || setter !== undefined) {
      if (initialValue !== undefined) {
        throw new Error(
          `An attribute cannot have both a getter or setter and an initial value (${this.describe()})`
        );
      }

      if (defaultValue !== undefined) {
        throw new Error(
          `An attribute cannot have both a getter or setter and a default value (${this.describe()})`
        );
      }

      if (getter !== undefined) {
        this._getter = getter;
      }

      if (setter !== undefined) {
        if (getter === undefined) {
          throw new Error(
            `An attribute cannot have a setter without a getter (${this.describe()})`
          );
        }
        this._setter = setter;
      }

      this._isSet = true;

      return;
    }

    if (hasInitialValue) {
      this.setValue(initialValue);
    }

    if (hasDefaultValue) {
      this._default = defaultValue;
    }
  }

  // === Value type ===

  _valueType!: ValueType;

  /**
   * Returns the type of values the attribute can store.
   *
   * @returns A [ValueType](https://liaison.dev/docs/v1/reference/value-type) instance.
   *
   * @example
   * ```
   * const title = Movie.prototype.getAttribute('title');
   * title.getValueType(); // => A ValueType instance
   * title.getValueType().toString(); // => 'string'
   * title.getValueType().isOptional(); // => false
   * ```
   *
   * @category Value Type
   */
  getValueType() {
    return this._valueType;
  }

  // === Value ===

  _value?: unknown;
  _isSet?: boolean;

  /**
   * Returns the current value of the attribute.
   *
   * @param [options.throwIfUnset] A boolean specifying whether the method should throw an error if the value is not set (default: `true`). If `false` is specified and the value is not set, the method returns `undefined`.
   *
   * @returns A value of the type handled by the attribute.
   *
   * @example
   * ```
   * const title = movie.getAttribute('title');
   * title.getValue(); // => 'Inception'
   * title.unsetValue();
   * title.getValue(); // => Error
   * title.getValue({throwIfUnset: false}); // => undefined
   * ```
   *
   * @category Value
   */
  getValue(options: {throwIfUnset?: boolean; autoFork?: boolean} = {}) {
    const {throwIfUnset = true, autoFork = true} = options;

    if (!this.isSet()) {
      if (throwIfUnset) {
        throw new Error(`Cannot get the value of an unset attribute (${this.describe()})`);
      }
      return undefined;
    }

    if (this._getter !== undefined) {
      return this._getter.call(this.getParent());
    }

    if (autoFork && !hasOwnProperty(this, '_value')) {
      const parent = this.getParent();
      const value = this._value;
      const componentClass = isComponentInstance(value)
        ? ensureComponentClass(parent).getComponent(value.constructor.getComponentName())
        : undefined;

      let forkedValue = fork(value, {componentClass});

      if (canBeObserved(forkedValue)) {
        if (!isObservable(forkedValue)) {
          forkedValue = createObservable(forkedValue);
        }

        if (isEmbeddable(forkedValue)) {
          forkedValue.addObserver(this);
        }
      }

      this._value = forkedValue;
    }

    return this._value;
  }

  _ignoreNextSetValueCall?: boolean;

  /**
   * Sets the value of the attribute. If the type of the value doesn't match the expected type, an error is thrown.
   *
   * @param value The value to be set.
   * @param [options.source] A number specifying the [source of the value](https://liaison.dev/docs/v1/reference/attribute#value-source-type) (default: `0`).
   *
   * @example
   * ```
   * const title = movie.getAttribute('title');
   * title.setValue('Inception 2');
   * title.setValue(123); // => Error
   * ```
   *
   * @category Value
   */
  setValue(value: unknown, {source = 0} = {}) {
    if (hasOwnProperty(this, '_ignoreNextSetValueCall')) {
      delete this._ignoreNextSetValueCall;
      return {previousValue: undefined, newValue: undefined};
    }

    if (this.isControlled() && source !== 1) {
      throw new Error(
        `Cannot set the value of a controlled attribute when the source is not 1 (${this.describe()}, source: ${source})`
      );
    }

    this.checkValue(value);

    if (this._setter !== undefined) {
      this._setter.call(this.getParent(), value);
      return {previousValue: undefined, newValue: undefined};
    }

    if (this._getter !== undefined) {
      throw new Error(
        `Cannot set the value of an attribute that has a getter but no setter (${this.describe()})`
      );
    }

    if (canBeObserved(value) && !isObservable(value)) {
      value = createObservable(value);
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = value;
    this._isSet = true;

    const valueHasChanged = (value as any)?.valueOf() !== (previousValue as any)?.valueOf();

    if (valueHasChanged) {
      if (isObservable(previousValue) && isEmbeddable(previousValue)) {
        previousValue.removeObserver(this);
      }

      if (isObservable(value) && isEmbeddable(value)) {
        value.addObserver(this);
      }
    }

    if (valueHasChanged || source !== this._source) {
      this.callObservers({source});
    }

    return {previousValue, newValue: value};
  }

  /**
   * Unsets the value of the attribute. If the value is already unset, nothing happens.
   *
   * @example
   * ```
   * const title = movie.getAttribute('title');
   * title.isSet(); // => true
   * title.unsetValue();
   * title.isSet(); // => false
   * ```
   *
   * @category Value
   */
  unsetValue() {
    if (this._getter !== undefined) {
      throw new Error(
        `Cannot unset the value of an attribute that has a getter (${this.describe()})`
      );
    }

    if (this._isSet !== true) {
      return {previousValue: undefined};
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = undefined;
    this._isSet = false;

    if (isObservable(previousValue) && isEmbeddable(previousValue)) {
      previousValue.removeObserver(this);
    }

    this.callObservers({source: 0});

    return {previousValue};
  }

  /**
   * Returns whether the value of the attribute is set or not.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * const title = movie.getAttribute('title');
   * title.isSet(); // => true
   * title.unsetValue();
   * title.isSet(); // => false
   * ```
   *
   * @category Value
   */
  isSet() {
    return this._isSet === true;
  }

  checkValue(value: unknown) {
    return this.getValueType().checkValue(value, this);
  }

  // === Value source ===

  _source = 0;

  /**
   * Returns the source of the value of the attribute.
   *
   * @returns A [`ValueSource`](https://liaison.dev/docs/v1/reference/attribute#value-source-type) number.
   *
   * @example
   * ```
   * const title = movie.getAttribute('title');
   * title.getValueSource(); // => 0 (the value was set locally)
   * ```
   *
   * @category Value Source
   */
  getValueSource() {
    return this._source;
  }

  /**
   * Sets the source of the value of the attribute.
   *
   * @param source A [`ValueSource`](https://liaison.dev/docs/v1/reference/attribute#value-source-type) number.
   *
   * @example
   * ```
   * const title = movie.getAttribute('title');
   * title.setValueSource(0); // The value was set locally
   * title.setValueSource(1); // The value came from an upper layer (e.g., the backend)
   * title.setValueSource(-1); // The value came from a lower layer (e.g., the frontend)
   * ```
   *
   * @category Value Source
   */
  setValueSource(source: number) {
    if (source !== this._source) {
      this._source = source;
      this.callObservers({source});
    }
  }

  /**
   * @typedef ValueSource
   *
   * A number representing the source of a value.
   *
   * Currently, three values are supported:
   *
   * * `0`: The value comes from the current layer (i.e., the current runtime environment).
   * * `1`: The value comes from an upper layer (e.g., the backend).
   * * `-1`: The value comes from a lower layer (e.g., the frontend).
   * ```
   *
   * @category Value Source
   */

  // === Default value ===

  _default?: unknown;

  /**
   * Returns the default value of the attribute as specified when the attribute was created.
   *
   * @returns A value or a function returning a value.
   *
   * @example
   * ```
   * const summary = movie.getAttribute('summary');
   * summary.getDefault(); // => function () { return ''; }
   * ```
   *
   * @category Default Value
   */
  getDefault() {
    return this._default;
  }

  /**
   * Evaluate the default value of the attribute. If the default value is a function, the function is called (with the attribute's parent as the `this` context), and the result is returned. Otherwise, the default value is returned as is.
   *
   * @returns A value of any type.
   *
   * @example
   * ```
   * const summary = movie.getAttribute('summary');
   * summary.evaluateDefault(); // ''
   * ```
   *
   * @category Default Value
   */
  evaluateDefault() {
    let value = this._default;

    if (typeof value === 'function' && !isComponentClass(value)) {
      value = value.call(this.getParent());
    }

    return value;
  }

  _isDefaultSetInConstructor?: boolean;

  _fixDecoration() {
    if (this._isDefaultSetInConstructor) {
      this._ignoreNextSetValueCall = true;
    }
  }

  // === 'isControlled' mark

  _isControlled?: boolean;

  isControlled() {
    return this._isControlled === true;
  }

  markAsControlled() {
    Object.defineProperty(this, '_isControlled', {value: true});
  }

  // === Observers ===

  _onChange(payload: ObserverPayload & {source?: number}) {
    const {source = 0} = payload;

    if (source !== this._source) {
      this._source = source;
    }

    this.getParent().callObservers(payload);
  }

  // === Attribute traversal ===

  _traverseAttributes(iteratee: TraverseAttributesIteratee, options: TraverseAttributesOptions) {
    const {setAttributesOnly} = options;

    const value = setAttributesOnly ? this.getValue() : undefined;

    this.getValueType()._traverseAttributes(iteratee, this, value, options);
  }

  // === Attribute selectors ===

  _resolveAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    options: ResolveAttributeSelectorOptions
  ) {
    const {setAttributesOnly} = options;

    const value = setAttributesOnly ? this.getValue() : undefined;

    return this.getValueType()._resolveAttributeSelector(
      normalizedAttributeSelector,
      this,
      value,
      options
    );
  }

  // === Serialization ===

  serialize(options: SerializeOptions = {}): unknown {
    if (!this.isSet()) {
      throw new Error(`Cannot serialize an unset attribute (${this.describe()})`);
    }

    return this.getValueType().serializeValue(this.getValue(), this, options);
  }

  // === Validation ===

  /**
   * Validates the value of the attribute. If the value doesn't pass the validation, an error is thrown. The error is a JavaScript `Error` instance with a `failedValidators` custom attribute which contains the result of the [`runValidators()`](https://liaison.dev/docs/v1/reference/attribute#run-validators-instance-method) method.
   *
   * @param [attributeSelector] In case the value of the attribute is a component, your can pass an [`AttributeSelector`](https://liaison.dev/docs/v1/reference/attribute-selector) specifying the component's attributes to be validated (default: `true` which means that all the component's attributes will be validated).
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, attribute, validators} from '﹫liaison/component';
   *
   * const {notEmpty} = validators;
   *
   * class Movie extends Component {
   *   ﹫attribute('string', {validators: [notEmpty()]}) title;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   * const title = movie.getAttribute('title');
   *
   * title.getValue(); // => 'Inception'
   * title.validate(); // All good!
   * title.setValue('');
   * title.validate(); // => Error {failedValidators: [{validator: ..., path: ''}]}
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, attribute, validators} from '﹫liaison/component';
   *
   * const {notEmpty} = validators;
   *
   * class Movie extends Component {
   *   ﹫attribute('string', {validators: [notEmpty()]}) title!: string;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   * const title = movie.getAttribute('title');
   *
   * title.getValue(); // => 'Inception'
   * title.validate(); // All good!
   * title.setValue('');
   * title.validate(); // => Error {failedValidators: [{validator: ..., path: ''}]}
   * ```
   *
   * @category Validation
   */
  validate(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    const error = Object.assign(
      new Error(
        `The following error(s) occurred while validating the attribute '${this.getName()}': ${details}`
      ),
      {failedValidators}
    );

    throw error;
  }

  /**
   * Returns whether the value of the attribute is valid.
   *
   * @param [attributeSelector] In case the value of the attribute is a component, your can pass an [`AttributeSelector`](https://liaison.dev/docs/v1/reference/attribute-selector) specifying the component's attributes to be validated (default: `true` which means that all the component's attributes will be validated).
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * // See the `title` definition in the `validate()` example
   *
   * title.getValue(); // => 'Inception'
   * title.isValid(); // => true
   * title.setValue('');
   * title.isValid(); // => false
   * ```
   *
   * @category Validation
   */
  isValid(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  /**
   * Runs the validators with the value of the attribute.
   *
   * @param [attributeSelector] In case the value of the attribute is a component, your can pass an [`AttributeSelector`](https://liaison.dev/docs/v1/reference/attribute-selector) specifying the component's attributes to be validated (default: `true` which means that all the component's attributes will be validated).
   *
   * @returns An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a `Validator` instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).
   *
   * @example
   * ```
   * // See the `title` definition in the `validate()` example
   *
   * title.getValue(); // => 'Inception'
   * title.runValidators(); // => []
   * title.setValue('');
   * title.runValidators(); // => [{validator: ..., path: ''}]
   * ```
   *
   * @category Validation
   */
  runValidators(attributeSelector: AttributeSelector = true) {
    if (!this.isSet()) {
      throw new Error(`Cannot run the validators of an unset attribute (${this.describe()})`);
    }

    const failedValidators = this.getValueType().runValidators(this.getValue(), attributeSelector);

    return failedValidators;
  }

  // === Introspection ===

  introspect() {
    const introspectedAttribute = super.introspect() as IntrospectedAttribute;

    if (introspectedAttribute === undefined) {
      return undefined;
    }

    const exposure = this.getExposure();
    const getIsExposed = exposure !== undefined ? hasOwnProperty(exposure, 'get') : false;
    const setIsExposed = exposure !== undefined ? hasOwnProperty(exposure, 'set') : false;

    if (getIsExposed && this.isSet()) {
      introspectedAttribute.value = this.getValue();
    }

    if (setIsExposed) {
      const defaultValue = this.getDefault();

      if (defaultValue !== undefined) {
        introspectedAttribute.default = defaultValue;
      }
    }

    Object.assign(introspectedAttribute, this.getValueType().introspect());

    return introspectedAttribute;
  }

  static unintrospect(introspectedAttribute: IntrospectedAttribute) {
    const {
      value: initialValue,
      default: defaultValue,
      valueType,
      validators,
      items,
      ...introspectedProperty
    } = introspectedAttribute;

    const hasInitialValue = 'value' in introspectedAttribute;
    const hasDefaultValue = 'default' in introspectedAttribute;

    const {name, options} = super.unintrospect(introspectedProperty) as UnintrospectedAttribute;

    if (hasInitialValue) {
      options.value = initialValue;
    }

    if (hasDefaultValue) {
      options.default = defaultValue;
    }

    Object.assign(options, unintrospectValueType({valueType, validators, items}));

    return {name, options};
  }

  // === Utilities ===

  static isAttribute(value: any): value is Attribute {
    return isAttributeInstance(value);
  }

  describeType() {
    return 'attribute';
  }
}

export function isAttributeClass(value: any): value is typeof Attribute {
  return typeof value?.isAttribute === 'function';
}

export function isAttributeInstance(value: any): value is Attribute {
  return isAttributeClass(value?.constructor) === true;
}
