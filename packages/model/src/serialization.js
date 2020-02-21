import {serialize as serializeComponent} from '@liaison/component';
import ow from 'ow';

import {isValidator} from './validator';

export function serialize(value, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({
      objectHandler: ow.optional.function
    })
  );

  const {objectHandler: originalObjectHandler} = options;

  const objectHandler = function(object) {
    if (originalObjectHandler !== undefined) {
      const serializedObject = originalObjectHandler(object);

      if (serializedObject !== undefined) {
        return serializedObject;
      }
    }

    if (isValidator(object)) {
      return object.serialize();
    }
  };

  options = {...options, objectHandler};

  return serializeComponent(value, options);
}
