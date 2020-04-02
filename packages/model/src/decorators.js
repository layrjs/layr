import {attribute as componentAttribute, _decorateAttribute} from '@liaison/component';
import ow from 'ow';

import {ModelAttribute} from './model-attribute';
import {isModelClassOrInstance} from './utilities';

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

    if (!isModelClassOrInstance(target)) {
      throw new Error(`@attribute() target doesn't inherit from Model (property name: '${name}')`);
    }

    return _decorateAttribute({target, name, descriptor, AttributeClass: ModelAttribute, options});
  };
}
