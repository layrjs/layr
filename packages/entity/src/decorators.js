import {_decorateAttribute} from '@liaison/model';
import {isClass} from 'core-helpers';
import ow from 'ow';

import {isEntityInstance} from './utilities';
import {PrimaryIdentifierAttribute} from './primary-identifier-attribute';
import {SecondaryIdentifierAttribute} from './secondary-identifier-attribute';

export function primaryIdentifier(type, options) {
  return identifier(PrimaryIdentifierAttribute, 'primaryIdentifier', type, options);
}

export function secondaryIdentifier(type, options) {
  return identifier(SecondaryIdentifierAttribute, 'secondaryIdentifier', type, options);
}

function identifier(IdentifierAttributeClass, decoratorName, type, options = {}) {
  ow(IdentifierAttributeClass, 'IdentifierAttributeClass', ow.function);
  ow(decoratorName, 'decoratorName', ow.string.nonEmpty);
  ow(type, 'type', ow.optional.string.nonEmpty);
  ow(options, 'options', ow.object);

  options = {...options, type};

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (isClass(target)) {
      throw new Error(
        `@${decoratorName}() cannot be used with a static attribute (property name: '${name}')`
      );
    }

    if (!isEntityInstance(target)) {
      throw new Error(
        `@${decoratorName}() target doesn't inherit from Entity (property name: '${name}')`
      );
    }

    if (
      !(
        (typeof descriptor.initializer === 'function' || descriptor.initializer === null) &&
        descriptor.enumerable === true
      )
    ) {
      throw new Error(
        `@${decoratorName}() cannot be used without an attribute declaration (property name: '${name}')`
      );
    }

    return _decorateAttribute({
      target,
      name,
      descriptor,
      AttributeClass: IdentifierAttributeClass,
      options
    });
  };
}
