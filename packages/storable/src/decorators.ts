import {
  Attribute,
  PrimaryIdentifierAttribute,
  SecondaryIdentifierAttribute,
  Method,
  createAttributeDecorator,
  createMethodDecorator,
  isComponentClassOrInstance,
  isComponentInstance
} from '@liaison/component';

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
