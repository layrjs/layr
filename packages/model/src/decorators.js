import {_decorateAttribute} from '@liaison/component';
import ow from 'ow';

import {isModelClass, isModel} from './model';
import {Field} from './field';

export function field(valueType, options = {}) {
  ow(valueType, 'valueType', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  options = {...options, valueType};

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isModelClass(target) || isModel(target))) {
      throw new Error(`@field() target doesn't inherit from Model (property name: '${name}')`);
    }

    if (
      !(
        (typeof descriptor.initializer === 'function' || descriptor.initializer === null) &&
        descriptor.enumerable === true
      )
    ) {
      throw new Error(
        `@field() cannot be used without a field declaration (property name: '${name}')`
      );
    }

    return _decorateAttribute({target, name, descriptor, AttributeClass: Field, options});
  };
}
