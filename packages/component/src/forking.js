import {fork as simpleFork} from 'simple-forking';
import ow from 'ow';

import {isComponentClassOrInstance} from './utilities';

export function fork(value, options = {}) {
  ow(options, 'options', ow.object.partialShape({objectForker: ow.optional.function}));

  const {objectForker: originalObjectForker, ...otherOptions} = options;

  const objectForker = function(object) {
    if (originalObjectForker !== undefined) {
      const forkedObject = originalObjectForker(object);

      if (forkedObject !== undefined) {
        return forkedObject;
      }
    }

    if (isComponentClassOrInstance(object)) {
      return object.fork(options);
    }
  };

  return simpleFork(value, {...otherOptions, objectForker});
}
