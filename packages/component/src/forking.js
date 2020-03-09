import {fork as simpleFork} from 'simple-forking';
import ow from 'ow';

import {isComponentClassOrInstance} from './utilities';

export function fork(value, options = {}) {
  ow(options, 'options', ow.object.partialShape({objectHandler: ow.optional.function}));

  const {objectHandler: originalObjectHandler, ...otherOptions} = options;

  const objectHandler = function(object) {
    if (originalObjectHandler !== undefined) {
      const forkedObject = originalObjectHandler(object);

      if (forkedObject !== undefined) {
        return forkedObject;
      }
    }

    if (isComponentClassOrInstance(object)) {
      return object.fork(options);
    }
  };

  return simpleFork(value, {...otherOptions, objectHandler});
}
