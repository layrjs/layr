import {
  Attribute,
  PrimaryIdentifierAttribute,
  SecondaryIdentifierAttribute,
  Method,
  createAttributeDecorator,
  createMethodDecorator,
  isComponentClassOrInstance,
  isComponentInstance
} from '@layr/component';

import {StorableComponent, SortDirection} from './storable';
import {
  StorablePropertyFinder,
  StorableAttribute,
  StorableAttributeOptions,
  StorablePrimaryIdentifierAttribute,
  StorableSecondaryIdentifierAttribute,
  StorableAttributeLoader,
  StorableMethod,
  StorableMethodOptions
} from './properties';
import type {IndexAttributes} from './index-class';
import {isStorableClass, isStorableInstance, isStorableClassOrInstance} from './utilities';

type StorableAttributeDecoratorOptions = Omit<StorableAttributeOptions, 'value' | 'default'>;

/**
 * Decorates an attribute of a storable component so it can be combined with a [`Loader`](https://layrjs.com/docs/v2/reference/storable-attribute#loader-type), a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type), or any kind of [`Hook`](https://layrjs.com/docs/v2/reference/storable-attribute#hook-type).
 *
 * @param [valueType] A string specifying the [type of values](https://layrjs.com/docs/v2/reference/value-type#supported-types) that can be stored in the attribute (default: `'any'`).
 * @param [options] The options to create the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute#constructor).
 *
 * @examplelink See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) class.
 *
 * @category Decorators
 * @decorator
 */
export function attribute(
  valueType?: string,
  options?: StorableAttributeDecoratorOptions
): PropertyDecorator;
export function attribute(options?: StorableAttributeDecoratorOptions): PropertyDecorator;
export function attribute(
  valueType?: string | StorableAttributeDecoratorOptions,
  options?: StorableAttributeDecoratorOptions
) {
  return createAttributeDecorator(
    new Map([
      [isStorableClassOrInstance, StorableAttribute],
      [isComponentClassOrInstance, Attribute]
    ]),
    'attribute',
    valueType,
    options
  );
}

/**
 * Decorates an attribute of a component as a [storable primary identifier attribute](https://layrjs.com/docs/v2/reference/storable-primary-identifier-attribute).
 *
 * @param [valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
 * @param [options] The options to create the [`StorablePrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/storable-primary-identifier-attribute#constructor).
 *
 * @category Decorators
 * @decorator
 */
export function primaryIdentifier(
  valueType?: string,
  options?: StorableAttributeDecoratorOptions
): PropertyDecorator;
export function primaryIdentifier(options?: StorableAttributeDecoratorOptions): PropertyDecorator;
export function primaryIdentifier(
  valueType?: string | StorableAttributeDecoratorOptions,
  options?: StorableAttributeDecoratorOptions
) {
  return createAttributeDecorator(
    new Map([
      [isStorableInstance, StorablePrimaryIdentifierAttribute],
      [isComponentInstance, PrimaryIdentifierAttribute]
    ]),
    'primaryIdentifier',
    valueType,
    options
  );
}

/**
 * Decorates an attribute of a component as a [storable secondary identifier attribute](https://layrjs.com/docs/v2/reference/storable-secondary-identifier-attribute).
 *
 * @param [valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
 * @param [options] The options to create the [`StorableSecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/storable-secondary-identifier-attribute#constructor).
 *
 * @category Decorators
 * @decorator
 */
export function secondaryIdentifier(
  valueType?: string,
  options?: StorableAttributeDecoratorOptions
): PropertyDecorator;
export function secondaryIdentifier(options?: StorableAttributeDecoratorOptions): PropertyDecorator;
export function secondaryIdentifier(
  valueType?: string | StorableAttributeDecoratorOptions,
  options?: StorableAttributeDecoratorOptions
) {
  return createAttributeDecorator(
    new Map([
      [isStorableInstance, StorableSecondaryIdentifierAttribute],
      [isComponentInstance, SecondaryIdentifierAttribute]
    ]),
    'secondaryIdentifier',
    valueType,
    options
  );
}

/**
 * Decorates a method of a storable component so it can be combined with a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type).
 *
 * @param [options] The options to create the [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method#constructor).
 *
 * @examplelink See an example of use in the [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) class.
 *
 * @category Decorators
 * @decorator
 */
export function method(options: StorableMethodOptions = {}) {
  return createMethodDecorator(
    new Map([
      [isStorableClassOrInstance, StorableMethod],
      [isComponentClassOrInstance, Method]
    ]),
    'method',
    options
  );
}

/**
 * Decorates a storable attribute with a [`Loader`](https://layrjs.com/docs/v2/reference/storable-attribute#loader-type).
 *
 * @param loader A function representing the [`Loader`](https://layrjs.com/docs/v2/reference/storable-attribute#loader-type) of the storable attribute.
 *
 * @examplelink See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) class.
 *
 * @category Decorators
 * @decorator
 */
export function loader(loader: StorableAttributeLoader) {
  return function (target: typeof StorableComponent | StorableComponent, name: string) {
    if (!isStorableClassOrInstance(target)) {
      throw new Error(
        `@loader() must be used as a storable component attribute decorator (property: '${name}')`
      );
    }

    if (
      !target.hasStorableAttribute(name) ||
      target.getStorableAttribute(name, {autoFork: false}).getParent() !== target
    ) {
      throw new Error(
        `@loader() must be used in combination with @attribute() (property: '${name}')`
      );
    }

    target.getStorableAttribute(name).setLoader(loader);
  };
}

/**
 * Decorates a storable attribute or method with a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type).
 *
 * @param finder A function representing the [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) of the storable attribute or method.
 *
 * @examplelink See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) and [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) classes.
 *
 * @category Decorators
 * @decorator
 */
export function finder(finder: StorablePropertyFinder) {
  return function (target: StorableComponent, name: string) {
    if (!isStorableInstance(target)) {
      throw new Error(
        `@finder() must be used as a storable component property decorator (property: '${name}')`
      );
    }

    if (
      !target.hasStorableProperty(name) ||
      target.getStorableProperty(name, {autoFork: false}).getParent() !== target
    ) {
      throw new Error(
        `@finder() must be used in combination with @attribute() or @method() (property: '${name}')`
      );
    }

    target.getStorableProperty(name).setFinder(finder);
  };
}

type ClassIndexParam = IndexAttributes;
type ClassIndexOptions = {isUnique?: boolean};
type AttributeIndexParam = {direction?: SortDirection; isUnique?: boolean};

/**
 * Defines an [index](https://layrjs.com/docs/v2/reference/index) for an attribute or a set of attributes.
 *
 * This decorator is commonly placed before a storable component attribute to define a [single attribute index](https://layrjs.com/docs/v2/reference/index#single-attribute-indexes), but it can also be placed before a storable component class to define a [compound attribute index](https://layrjs.com/docs/v2/reference/index#compound-attribute-indexes).
 *
 * @param [optionsOrAttributes] Depends on the type of index you want to define (see below).
 * @param [options] An object specifying some options in the case of compound attribute index (see below).
 *
 * @details
 * ###### Single Attribute Indexes
 *
 * You can define an index for a single attribute by placing the `@index()` decorator before an attribute definition. In this case, you can specify the following parameters:
 *
 * - `options`:
 *   - `direction`: A string representing the sort direction of the index. The possible values are `'asc'` (ascending) or `'desc'` (descending) and the default value is `'asc'`.
 *   - `isUnique`: A boolean specifying whether the index should hold unique values or not (default: `false`). When set to `true`, the underlying database will prevent you to store an attribute with the same value in multiple storable components.
 *
 * ###### Compound Attribute Indexes
 *
 * You can define an index that combines multiple attributes by placing the `@index()` decorator before a storable component class definition. In this case, you can specify the following parameters:
 *
 * - `attributes`: An object specifying the attributes to be indexed. The shape of the object should be `{attributeName: direction, ...}` where `attributeName` is a string representing the name of an attribute and `direction` is a string representing the sort direction (possible values: `'asc'` or `'desc'`).
 * - `options`:
 *   - `isUnique`: A boolean specifying whether the index should hold unique values or not (default: `false`). When set to `true`, the underlying database will prevent you to store an attribute with the same value in multiple storable components.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component} from '@layr/component';
 * import {Storable, attribute, index} from '@layr/storable';
 *
 * // An index that combines the `year` and `title` attributes:
 * ﹫index({year: 'desc', title: 'asc'})
 * export class Movie extends Storable(Component) {
 *   // An index for the `title` attribute with the `isUnique` option:
 *   @index({isUnique: true}) @attribute('string') title;
 *
 *   // An index for the `year` attribute with the `'desc'` sort direction:
 *   @index({direction: 'desc'}) @attribute('number') year;
 * }
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component} from '@layr/component';
 * import {Storable, attribute, index} from '@layr/storable';
 *
 * // An index that combines the `year` and `title` attributes:
 * ﹫index({year: 'desc', title: 'asc'})
 * export class Movie extends Storable(Component) {
 *   // An index for the `title` attribute with the `isUnique` option:
 *   @index({isUnique: true}) @attribute('string') title!: string;
 *
 *   // An index for the `year` attribute with the `'desc'` sort direction:
 *   @index({direction: 'desc'}) @attribute('number') year!: string;
 * }
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function index(
  param?: AttributeIndexParam
): (target: StorableComponent, name: string) => void;
export function index(
  param: ClassIndexParam,
  options?: ClassIndexOptions
): (target: typeof StorableComponent) => void;
export function index(
  param: ClassIndexParam | AttributeIndexParam = {},
  options: ClassIndexOptions = {}
) {
  return function (target: typeof StorableComponent | StorableComponent, name?: string) {
    if (name === undefined) {
      // Class decorator

      if (!isStorableClass(target)) {
        throw new Error(
          `@index() must be used as a storable component class decorator or a storable component attribute decorator`
        );
      }

      target.prototype.setIndex(param as ClassIndexParam, options);

      return;
    }

    // Attribute decorator

    if (!isStorableInstance(target)) {
      throw new Error(
        `@index() must be used as a storable component class decorator or a storable component attribute decorator (property: '${name}')`
      );
    }

    if (
      !target.hasProperty(name) ||
      target.getProperty(name, {autoFork: false}).getParent() !== target
    ) {
      throw new Error(
        `@index() must be used in combination with @attribute() (property: '${name}')`
      );
    }

    const {direction = 'asc', isUnique} = param as AttributeIndexParam;

    target.setIndex({[name]: direction}, {isUnique});
  };
}
