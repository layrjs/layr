import {merge as simpleMerge} from 'simple-forking';
import ow from 'ow';

import {isComponentClassOrInstance} from './utilities';

export function merge(value, forkedValue, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({objectMerger: ow.optional.function, objectCloner: ow.optional.function})
  );

  const {
    objectMerger: originalObjectMerger,
    objectCloner: originalObjectCloner,
    ...otherOptions
  } = options;

  const objectMerger = function(object, forkedObject) {
    if (originalObjectMerger !== undefined) {
      const mergedObject = originalObjectMerger(object, forkedObject);

      if (mergedObject !== undefined) {
        return mergedObject;
      }
    }

    if (isComponentClassOrInstance(object)) {
      return object.merge(forkedObject, options);
    }
  };

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

  return simpleMerge(value, forkedValue, {...otherOptions, objectMerger, objectCloner});
}
