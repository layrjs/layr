import {
  attribute as componentAttribute,
  _decorateAttribute,
  _decorateMethod
} from '@liaison/component';
import {_identifierDecorator} from '@liaison/entity';
import {isClass} from 'core-helpers';
import ow from 'ow';

import {StorableAttribute} from './storable-attribute';
import {StorableMethod} from './storable-method';
import {StorablePrimaryIdentifierAttribute} from './storable-primary-identifier-attribute';
import {StorableSecondaryIdentifierAttribute} from './storable-secondary-identifier-attribute';
import {isStorableInstance, isStorableClassOrInstance} from './utilities';

export function attribute(type, options = {}) {
  if (typeof type !== 'string') {
    options = type;
    return componentAttribute(options);
  }

  ow(type, 'type', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  options = {...options, type};

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!isStorableClassOrInstance(target)) {
      throw new Error(
        `@attribute() target doesn't inherit from Storable (property name: '${name}')`
      );
    }

    return _decorateAttribute({
      target,
      name,
      descriptor,
      AttributeClass: StorableAttribute,
      options
    });
  };
}

export function method(options = {}) {
  ow(options, 'options', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!isStorableClassOrInstance(target)) {
      throw new Error(`@method() target doesn't inherit from Storable (property name: '${name}')`);
    }

    return _decorateMethod({target, name, descriptor, MethodClass: StorableMethod, options});
  };
}

export function primaryIdentifier(type, options) {
  return _identifierDecorator(
    StorablePrimaryIdentifierAttribute,
    'primaryIdentifier',
    type,
    options
  );
}

export function secondaryIdentifier(type, options) {
  return _identifierDecorator(
    StorableSecondaryIdentifierAttribute,
    'secondaryIdentifier',
    type,
    options
  );
}

export function loader(loaderFunction) {
  ow(loaderFunction, 'loaderFunction', ow.function);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!isStorableClassOrInstance(target)) {
      throw new Error(`@loader() target doesn't inherit from Storable (property name: '${name}')`);
    }

    const {__decoratedBy: decoratedBy} = descriptor;

    if (decoratedBy === '@attribute()' || decoratedBy === '@inherit()') {
      const attribute = target.getAttribute(name);
      attribute.setLoader(loaderFunction);
      return descriptor;
    }

    throw new Error(
      `@loader() must be used in conjunction with @attribute() or @inherit() (property name: '${name}')`
    );
  };
}

export function finder(finderFunction) {
  ow(finderFunction, 'finderFunction', ow.function);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (isClass(target)) {
      throw new Error(
        `@finder() cannot be used on static attributes or methods (property name: '${name}')`
      );
    }

    if (!isStorableInstance(target)) {
      throw new Error(`@finder() target doesn't inherit from Storable (property name: '${name}')`);
    }

    const {__decoratedBy: decoratedBy} = descriptor;

    if (
      decoratedBy === '@attribute()' ||
      decoratedBy === '@method()' ||
      decoratedBy === '@inherit()'
    ) {
      const property = target.getProperty(name);
      property.setFinder(finderFunction);
      return descriptor;
    }

    if (!(typeof descriptor.value === 'function' && descriptor.enumerable === false)) {
      throw new Error(
        `@finder() must be used in conjunction with @attribute(), @method(), @inherit(), or with a method declaration (property name: '${name}')`
      );
    }

    return _decorateMethod({
      target,
      name,
      descriptor,
      MethodClass: StorableMethod,
      decoratorName: 'finder',
      options: {finder: finderFunction}
    });
  };
}
