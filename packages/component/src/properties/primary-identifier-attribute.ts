import {hasOwnProperty} from 'core-helpers';

import type {Component} from '../component';
import type {AttributeOptions} from './attribute';
import {IdentifierAttribute, IdentifierValue} from './identifier-attribute';
import {isComponentInstance, ensureComponentClass} from '../utilities';

/**
 * *Inherits from [`IdentifierAttribute`](https://liaison.dev/docs/v1/reference/identifier-attribute).*
 *
 * A `PrimaryIdentifierAttribute` is a special kind of attribute that uniquely identify a [Component](https://liaison.dev/docs/v1/reference/component) instance.
 *
 * A `Component` can have only one `PrimaryIdentifierAttribute`. To define a `Component` with more than one identifier, you can add some [`SecondaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/secondary-identifier-attribute) in addition to the `PrimaryIdentifierAttribute`.
 *
 * Another characteristic of a `PrimaryIdentifierAttribute` is that its value is immutable (i.e., once set it cannot change). This ensures a stable identity of the components across the different layers of an application (e.g., frontend, backend, and database).
 *
 * #### Usage
 *
 * Typically, you create a `PrimaryIdentifierAttribute` and associate it to a component prototype using the [`@primaryIdentifier()`](https://liaison.dev/docs/v1/reference/component#primary-identifier-decorator) decorator.
 *
 * For example, here is how you would define a `Movie` class with an `id` primary identifer attribute:
 *
 * ```
 * // JS
 *
 * import {Component, primaryIdentifier, attribute} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // An auto-generated 'string' primary identifier attribute
 *   ﹫primaryIdentifier() id;
 *
 *   // A regular attribute
 *   ﹫attribute('string') title;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, primaryIdentifier, attribute} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // An auto-generated 'string' primary identifier attribute
 *   ﹫primaryIdentifier() id!: string;
 *
 *   // A regular attribute
 *   ﹫attribute('string') title!: string;
 * }
 * ```
 *
 * Then, to create a `Movie` instance, you would do something like:
 *
 * ```
 * const movie = new Movie({title: 'Inception'});
 *
 * movie.id; // => 'ck41vli1z00013h5xx1esffyn'
 * movie.title; // => 'Inception'
 * ```
 *
 * Note that we didn't have to specify a value for the `id` attribute; it was automatically generated (using the [`Component.generateId()`](https://liaison.dev/docs/v1/reference/component#generate-id-class-method) method under the hood).
 *
 * To create a `Movie` instance with an `id` of your choice, just do:
 *
 * ```
 * const movie = new Movie({id: 'abc123', title: 'Inception'});
 *
 * movie.id; // => 'abc123'
 * movie.title; // => 'Inception'
 * ```
 *
 * When a component has a primary identifier attribute, all the instances of the component are managed by an [`IdentityMap`](https://liaison.dev/docs/v1/reference/identity-map) ensuring that there is only one instance with a specific identifier.
 *
 * So, since we previously created a `Movie` with `'abc123'` as primary identifier, we cannot create another `Movie` with the same primary identifier:
 *
 * ```
 * new Movie({id: 'abc123', title: 'Inception 2'}); // => Error
 * ```
 *
 * `PrimaryIdentifierAttribute` values are usually of type `'string'` (the default), but you can also have values of type `'number'`:
 *
 * ```
 * // JS
 *
 * import {Component, primaryIdentifier} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // An auto-generated 'number' primary identifier attribute
 *   ﹫primaryIdentifier('number') id = Math.random();
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, primaryIdentifier} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   // An auto-generated 'number' primary identifier attribute
 *   ﹫primaryIdentifier('number') id = Math.random();
 * }
 * ```
 */
export class PrimaryIdentifierAttribute extends IdentifierAttribute {
  /**
   * Creates an instance of [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute). Typically, instead of using this constructor, you would rather use the [`@primaryIdentifier()`](https://liaison.dev/docs/v1/reference/component#primary-identifier-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The component prototype that owns the attribute.
   * @param [options.valueType] A string specifying the [type of values](https://liaison.dev/docs/v1/reference/value-type) the attribute can store (default: `'string'`). Only `'string'` and `'number'` are supported for the identifier attributes.
   * @param [options.default] A function returning the default value of the attribute (default when `valueType` is `'string'`: `function () { return this.constructor.generateId() }`).
   * @param [options.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validation) for the value of the attribute.
   * @param [options.exposure] A [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.
   *
   * @returns The [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute) instance that was created.
   *
   * @example
   * ```
   * import {Component, PrimaryIdentifierAttribute} from '﹫liaison/component';
   *
   * class Movie extends Component {}
   *
   * const id = new PrimaryIdentifierAttribute('id', Movie.prototype);
   *
   * id.getName(); // => 'id'
   * id.getParent(); // => Movie.prototype
   * id.getValueType().toString(); // => 'string'
   * id.getDefaultValue(); // => function () { return this.constructor.generateId() }`
   * ```
   *
   * @category Creation
   */
  constructor(name: string, parent: Component, options: AttributeOptions = {}) {
    if (
      isComponentInstance(parent) &&
      parent.hasPrimaryIdentifierAttribute() &&
      parent.getPrimaryIdentifierAttribute().getName() !== name
    ) {
      throw new Error(
        `The component '${ensureComponentClass(
          parent
        ).getComponentName()}' already has a primary identifier attribute`
      );
    }

    super(name, parent, options);
  }

  // === Options ===

  setOptions(options: AttributeOptions = {}) {
    let {valueType = 'string', default: defaultValue} = options;

    if (valueType === 'string' && defaultValue === undefined) {
      defaultValue = primaryIdentifierAttributeStringDefaultValue;
    }

    super.setOptions({...options, default: defaultValue});
  }

  // === Value ===

  setValue(value: IdentifierValue, {source = 0} = {}) {
    if (hasOwnProperty(this, '_ignoreNextSetValueCall')) {
      delete this._ignoreNextSetValueCall;
      return {previousValue: undefined, newValue: undefined};
    }

    const previousValue = this.getValue({throwIfUnset: false, autoFork: false});

    if (previousValue !== undefined && value !== previousValue) {
      throw new Error(
        `The value of a primary identifier attribute cannot be modified (${this.describe()})`
      );
    }

    return super.setValue(value, {source});
  }

  // === Utilities ===

  static isPrimaryIdentifierAttribute(value: any): value is PrimaryIdentifierAttribute {
    return isPrimaryIdentifierAttributeInstance(value);
  }
}

/**
 * Returns whether the specified value is a `PrimaryIdentifierAttribute` class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isPrimaryIdentifierAttributeClass(
  value: any
): value is typeof PrimaryIdentifierAttribute {
  return typeof value?.isPrimaryIdentifierAttribute === 'function';
}

/**
 * Returns whether the specified value is a `PrimaryIdentifierAttribute` instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isPrimaryIdentifierAttributeInstance(
  value: any
): value is PrimaryIdentifierAttribute {
  return isPrimaryIdentifierAttributeClass(value?.constructor) === true;
}

export const primaryIdentifierAttributeStringDefaultValue = (function () {
  // Makes the function anonymous to make it a bit lighter when serialized
  return function (this: Component) {
    return this.constructor.generateId();
  };
})();
