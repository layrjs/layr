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

import {StorableComponent} from './storable';
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
import {isStorableClassOrInstance, isStorableInstance} from './utilities';

type StorableAttributeDecoratorOptions = Omit<StorableAttributeOptions, 'value' | 'default'>;

/**
 * Decorates an attribute of a storable component so it can be combined with a [`Loader`](https://layrjs.com/docs/v1/reference/storable-attribute#loader-type), a [`Finder`](https://layrjs.com/docs/v1/reference/storable-property#finder-type), or any kind of [`Hook`](https://layrjs.com/docs/v1/reference/storable-attribute#hook-type).
 *
 * @param [valueType] A string specifying the [type of values](https://layrjs.com/docs/v1/reference/value-type#supported-types) that can be stored in the attribute (default: `'any'`).
 * @param [options] The options to create the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute#constructor).
 *
 * @examplelink See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute) class.
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
 * Decorates an attribute of a component as a [storable primary identifier attribute](https://layrjs.com/docs/v1/reference/storable-primary-identifier-attribute).
 *
 * @param [valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
 * @param [options] The options to create the [`StorablePrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/storable-primary-identifier-attribute#constructor).
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
 * Decorates an attribute of a component as a [storable secondary identifier attribute](https://layrjs.com/docs/v1/reference/storable-secondary-identifier-attribute).
 *
 * @param [valueType] A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
 * @param [options] The options to create the [`StorableSecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/storable-secondary-identifier-attribute#constructor).
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
 * Decorates a method of a storable component so it can be combined with a [`Finder`](https://layrjs.com/docs/v1/reference/storable-property#finder-type).
 *
 * @param [options] The options to create the [`StorableMethod`](https://layrjs.com/docs/v1/reference/storable-method#constructor).
 *
 * @examplelink See an example of use in the [`StorableMethod`](https://layrjs.com/docs/v1/reference/storable-method) class.
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
 * Decorates a storable attribute with a [`Loader`](https://layrjs.com/docs/v1/reference/storable-attribute#loader-type).
 *
 * @param loader A function representing the [`Loader`](https://layrjs.com/docs/v1/reference/storable-attribute#loader-type) of the storable attribute.
 *
 * @examplelink See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute) class.
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
 * Decorates a storable attribute or method with a [`Finder`](https://layrjs.com/docs/v1/reference/storable-property#finder-type).
 *
 * @param finder A function representing the [`Finder`](https://layrjs.com/docs/v1/reference/storable-property#finder-type) of the storable attribute or method.
 *
 * @examplelink See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v1/reference/storable-attribute) and [`StorableMethod`](https://layrjs.com/docs/v1/reference/storable-method) classes.
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
