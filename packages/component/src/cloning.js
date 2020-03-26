import {clone as simpleClone} from 'simple-cloning';
import ow from 'ow';

import {isComponentClassOrInstance} from './utilities';

export function clone(value, options = {}) {
  ow(options, 'options', ow.object.partialShape({objectCloner: ow.optional.function}));

  const {objectCloner: originalObjectCloner, ...otherOptions} = options;

  const objectCloner = function(object) {
    if (originalObjectCloner !== undefined) {
      const clonedObject = originalObjectCloner(object);

      if (clonedObject !== undefined) {
        return clonedObject;
      }
    }

    if (isComponentClassOrInstance(object)) {
      return object.clone(options);
    }
  };

  return simpleClone(value, {...otherOptions, objectCloner});
}
