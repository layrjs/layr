import {_decorateAttribute} from '@liaison/component';
import ow from 'ow';

import {isModelClass, isModel} from './model';
import {ModelAttribute} from './model-attribute';

export {attribute as componentAttribute} from '@liaison/component';

export function modelAttribute(type, options = {}, {_decoratorName = 'modelAttribute'} = {}) {
  ow(type, 'type', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  options = {...options, type};

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isModelClass(target) || isModel(target))) {
      throw new Error(
        `@${_decoratorName}() target doesn't inherit from Model (property name: '${name}')`
      );
    }

    if (
      !(
        (typeof descriptor.initializer === 'function' || descriptor.initializer === null) &&
        descriptor.enumerable === true
      )
    ) {
      throw new Error(
        `@${_decoratorName}() cannot be used without an attribute declaration (property name: '${name}')`
      );
    }

    return _decorateAttribute({target, name, descriptor, AttributeClass: ModelAttribute, options});
  };
}

export function attribute(type, options) {
  return modelAttribute(type, options, {_decoratorName: 'attribute'});
}
