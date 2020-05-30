import {
  Component,
  Attribute,
  PrimaryIdentifierAttribute,
  SecondaryIdentifierAttribute,
  Method,
  createAttributeDecorator,
  createMethodDecorator
} from '@liaison/component';

import {Storable} from './storable';
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
import {isStorableInstance, isStorableClassOrInstance} from './utilities';

type StorableAttributeDecoratorOptions = Omit<StorableAttributeOptions, 'value' | 'default'>;

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
      [Storable, StorableAttribute],
      [Component, Attribute]
    ]),
    'attribute',
    valueType,
    options
  );
}

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
      [Storable, StorablePrimaryIdentifierAttribute],
      [Component, PrimaryIdentifierAttribute]
    ]),
    'primaryIdentifier',
    valueType,
    options
  );
}

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
      [Storable, StorableSecondaryIdentifierAttribute],
      [Component, SecondaryIdentifierAttribute]
    ]),
    'secondaryIdentifier',
    valueType,
    options
  );
}

export function method(options: StorableMethodOptions = {}) {
  return createMethodDecorator(
    new Map([
      [Storable, StorableMethod],
      [Component, Method]
    ]),
    'method',
    options
  );
}

export function loader(loader: StorableAttributeLoader) {
  return function (target: typeof Storable | Storable, name: string) {
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

export function finder(finder: StorablePropertyFinder) {
  return function (target: Storable, name: string) {
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
