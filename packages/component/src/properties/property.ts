import {possiblyAsync} from 'possibly-async';
import {assertIsString, assertNoUnknownOptions, PlainObject, getTypeOf} from 'core-helpers';
import mapValues from 'lodash/mapValues';

import type {Component} from '../component';
import {ensureComponentClass, assertIsComponentClassOrInstance} from '../utilities';

export type PropertyOptions = {
  exposure?: PropertyExposure;
};

export type PropertyExposure = Partial<Record<PropertyOperation, PropertyOperationSetting>>;

export type PropertyOperation = 'get' | 'set' | 'call';

export type PropertyOperationSetting = boolean | string | string[];

export type PropertyFilter = (property: any) => boolean | PromiseLike<boolean>;
export type PropertyFilterSync = (property: any) => boolean;
export type PropertyFilterAsync = (property: any) => PromiseLike<boolean>;

export type IntrospectedProperty = {
  name: string;
  type: string;
  exposure?: IntrospectedExposure;
};

export type IntrospectedExposure = Partial<Record<PropertyOperation, boolean>>;

export type UnintrospectedProperty = {
  name: string;
  options: {
    exposure?: UnintrospectedExposure;
  };
};

export type UnintrospectedExposure = Partial<Record<PropertyOperation, true>>;

/**
 * A base class from which classes such as [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) or [`Method`](https://layrjs.com/docs/v2/reference/method) are constructed. Unless you build a custom property class, you probably won't have to use this class directly.
 */
export class Property {
  _name: string;
  _parent: typeof Component | Component;

  /**
   * Creates an instance of [`Property`](https://layrjs.com/docs/v2/reference/property).
   *
   * @param name The name of the property.
   * @param parent The component class, prototype, or instance that owns the property.
   * @param [options.exposure] A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the property should be exposed to remote access.
   *
   * @returns The [`Property`](https://layrjs.com/docs/v2/reference/property) instance that was created.
   *
   * @example
   * ```
   * import {Component, Property} from '﹫layr/component';
   *
   * class Movie extends Component {}
   *
   * const titleProperty = new Property('title', Movie.prototype);
   *
   * titleProperty.getName(); // => 'title'
   * titleProperty.getParent(); // => Movie.prototype
   * ```
   *
   * @category Creation
   */
  constructor(name: string, parent: typeof Component | Component, options: PropertyOptions = {}) {
    assertIsString(name);
    assertIsComponentClassOrInstance(parent);

    this._name = name;
    this._parent = parent;

    this.setOptions(options);

    this._initialize();
  }

  _initialize() {}

  /**
   * Returns the name of the property.
   *
   * @returns A string.
   *
   * @example
   * ```
   * titleProperty.getName(); // => 'title'
   * ```
   *
   * @category Basic Methods
   */
  getName() {
    return this._name;
  }

  /**
   * Returns the parent of the property.
   *
   * @returns A component class, prototype, or instance.
   *
   * @example
   * ```
   * titleProperty.getParent(); // => Movie.prototype
   * ```
   *
   * @category Basic Methods
   */
  getParent() {
    return this._parent;
  }

  // === Options ===

  setOptions(options: PropertyOptions = {}) {
    const {exposure, ...unknownOptions} = options;

    assertNoUnknownOptions(unknownOptions);

    if (exposure !== undefined) {
      this.setExposure(exposure);
    }
  }

  // === Exposure ===

  _exposure?: PropertyExposure;

  /**
   * Returns an object specifying how the property is exposed to remote access.
   *
   * @returns A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object.
   *
   * @example
   * ```
   * titleProperty.getExposure(); // => {get: true, set: true}
   * ```
   *
   * @category Exposure
   */
  getExposure() {
    return this._exposure;
  }

  /**
   * Sets how the property is exposed to remote access.
   *
   * @param [exposure] A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object.
   *
   * @example
   * ```
   * titleProperty.setExposure({get: true, set: true});
   * ```
   *
   * @category Exposure
   */
  setExposure(exposure = {}) {
    this._exposure = this._normalizeExposure(exposure);
  }

  _normalizeExposure(exposure: PropertyExposure) {
    let normalizedExposure: PlainObject | undefined;

    for (const [operation, setting] of Object.entries(exposure)) {
      if (setting === undefined) {
        continue;
      }

      const normalizedSetting = ensureComponentClass(
        this._parent
      ).normalizePropertyOperationSetting(setting);

      if (normalizedSetting === undefined) {
        continue;
      }

      if (normalizedExposure === undefined) {
        normalizedExposure = {};
      }

      normalizedExposure[operation] = normalizedSetting;
    }

    return normalizedExposure as PropertyExposure | undefined;
  }

  /**
   * Returns whether an operation is allowed on the property.
   *
   * @param operation A string representing an operation. Currently supported operations are 'get', 'set', and 'call'.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * titleProperty.operationIsAllowed('get'); // => true
   * titleProperty.operationIsAllowed('call'); // => false
   * ```
   *
   * @category Exposure
   * @possiblyasync
   */
  operationIsAllowed(operation: PropertyOperation) {
    const setting = this._exposure?.[operation];

    if (setting === undefined) {
      return false;
    }

    return possiblyAsync(
      this._parent.resolvePropertyOperationSetting(setting),
      (resolvedSetting) => resolvedSetting === true
    );
  }

  /**
   * @typedef PropertyExposure
   *
   * A `PropertyExposure` is a plain object specifying how a property is exposed to remote access.
   *
   * The shape of the object is `{[operation]: permission}` where:
   *
   * - `operation` is a string representing the different types of operations (`'get'` and `'set'` for attributes, and `'call'` for methods).
   * - `permission` is a boolean (or a string or array of strings if the [`WithRoles`](https://layrjs.com/docs/v2/reference/with-roles) mixin is used) specifying whether the operation is allowed or not.
   *
   * @example
   * ```
   * {get: true, set: true}
   * {get: 'anyone', set: ['author', 'admin']}
   * {call: true}
   * {call: 'admin'}
   * ```
   *
   * @category Exposure
   */

  // === Forking ===

  fork<T extends Property>(this: T, parent: typeof Component | Component) {
    const forkedProperty = Object.create(this) as T;

    forkedProperty._parent = parent;

    forkedProperty._initialize();

    return forkedProperty;
  }

  // === Introspection ===

  introspect() {
    const introspectedExposure = this.introspectExposure();

    if (introspectedExposure === undefined) {
      return undefined;
    }

    return {
      name: this.getName(),
      type: getTypeOf(this),
      exposure: introspectedExposure
    } as IntrospectedProperty;
  }

  introspectExposure() {
    const exposure = this.getExposure();

    if (exposure === undefined) {
      return undefined;
    }

    // We don't want to expose backend operation settings to the frontend
    // So if there is a {call: 'admin'} exposure, we want to return {call: true}
    const introspectedExposure = mapValues(exposure, () => true);

    return introspectedExposure as IntrospectedExposure;
  }

  static unintrospect(introspectedProperty: IntrospectedProperty) {
    const {name, type: _type, ...options} = introspectedProperty;

    return {name, options} as UnintrospectedProperty;
  }

  // === Utilities ===

  static isProperty(value: any): value is Property {
    return isPropertyInstance(value);
  }

  describeType() {
    return 'property';
  }

  describe() {
    return `${this.describeType()}: '${this.getParent().describeComponentProperty(
      this.getName()
    )}'`;
  }
}

export function isPropertyClass(value: any): value is typeof Property {
  return typeof value?.isProperty === 'function';
}

export function isPropertyInstance(value: any): value is Property {
  return isPropertyClass(value?.constructor) === true;
}
