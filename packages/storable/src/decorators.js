import {
  attribute as componentAttribute,
  _decorateAttribute,
  _decorateMethod
} from '@liaison/component';
import {_identifierDecorator} from '@liaison/entity';
import ow from 'ow';

import {StorableAttribute} from './storable-attribute';
import {StorableMethod} from './storable-method';
import {StorablePrimaryIdentifierAttribute} from './storable-primary-identifier-attribute';
import {StorableSecondaryIdentifierAttribute} from './storable-secondary-identifier-attribute';
import {isStorableClassOrInstance} from './utilities';

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
