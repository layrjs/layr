import {Component, Property, PropertyOptions} from '@liaison/component';
import {Query} from '@liaison/store';
import {PromiseLikeable, Constructor} from 'core-helpers';

import {assertIsStorableClassOrInstance} from '../utilities';

export type StorablePropertyOptions = PropertyOptions & {
  finder?: StorablePropertyFinder;
};

export type StorablePropertyFinder = (value: unknown) => PromiseLikeable<Query>;

export const StorablePropertyMixin = <T extends Constructor<typeof Property>>(Base: T) =>
  /**
   * @name StorableProperty
   *
   * *Inherits from [`Property`](https://liaison.dev/docs/v1/reference/property).*
   *
   * A base class from which classes such as [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute) or [`StorableMethod`](https://liaison.dev/docs/v1/reference/storable-method) are constructed. Unless you build a custom property class, you probably won't have to use this class directly.
   */
  class extends Base {
    /**
     * @constructor
     *
     * Creates a storable property.
     *
     * @param name The name of the property.
     * @param parent The [storable component](https://liaison.dev/docs/v1/reference/storable#storable-component-class) class, prototype, or instance that owns the property.
     * @param [options.finder] A function specifying a [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type) for the property.
     * @param [options.exposure] A [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type) object specifying how the property should be exposed to remote access.
     *
     * @returns The [`StorableProperty`](https://liaison.dev/docs/v1/reference/storable-property) instance that was created.
     *
     * @category Creation
     */

    // === Options ===

    setOptions(options: StorablePropertyOptions = {}) {
      const {finder, ...otherOptions} = options;

      this._finder = finder;

      super.setOptions(otherOptions);
    }

    // === Finder ===

    _finder: StorablePropertyFinder | undefined;

    /**
     * Returns the [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type)of  the property.
     *
     * @returns A [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type) function (or `undefined` if the property has no associated finder).
     *
     * @category Finder
     */
    getFinder() {
      return this._finder;
    }

    /**
     * Returns whether the property has a [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type).
     *
     * @returns A boolean.
     *
     * @category Finder
     */
    hasFinder() {
      return this.getFinder() !== undefined;
    }

    /**
     * Sets a [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type) for the property.
     *
     * @param finder The [`Finder`](https://liaison.dev/docs/v1/reference/storable-property#finder-type) function to set.
     *
     * @category Finder
     */
    setFinder(finder: StorablePropertyFinder) {
      this._finder = finder;
    }

    async callFinder(value: unknown) {
      const finder = this.getFinder();

      if (finder === undefined) {
        throw new Error(`Cannot call a finder that is missing (${this.describe()})`);
      }

      return await finder.call(this.getParent(), value);
    }

    /**
     * @typedef Finder
     *
     * A function representing the "finder" of a property.
     *
     * The function should return a [`Query`](https://liaison.dev/docs/v1/reference/query) for the property that is queried for.
     *
     * The function has the following characteristics:
     *
     * - It can be `async`.
     * - As first parameter, it receives the value that was specified in the user's query.
     * - It is executed with the parent of the property as `this` context.
     *
     * See an example of use in the [`StorableAttribute`](https://liaison.dev/docs/v1/reference/storable-attribute) and [`StorableMethod`](https://liaison.dev/docs/v1/reference/storable-method) classes.
     *
     * @category Finder
     */

    // === Utilities ===

    static isStorableProperty(value: any): value is StorableProperty {
      return isStorablePropertyInstance(value);
    }
  };

export function isStorablePropertyClass(value: any): value is typeof StorableProperty {
  return typeof value?.isStorableProperty === 'function';
}

export function isStorablePropertyInstance(value: any): value is StorableProperty {
  return isStorablePropertyClass(value?.constructor) === true;
}

export class StorableProperty extends StorablePropertyMixin(Property) {
  constructor(
    name: string,
    parent: typeof Component | Component,
    options: StorablePropertyOptions = {}
  ) {
    assertIsStorableClassOrInstance(parent);

    super(name, parent, options);
  }
}
