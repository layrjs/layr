import {deserialize as deserializeComponent} from '@liaison/component';
import ow from 'ow';

import {Validator, isSerializedValidator} from './validation/validator';

export function deserialize(value, options = {}) {
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
      const deserializedObject = originalObjectHandler(object);

      if (deserializedObject !== undefined) {
        return deserializedObject;
      }
    }

    if (isSerializedValidator(object)) {
      return Validator.deserialize(object);
    }
  };

  options = {...options, objectHandler};

  return deserializeComponent(value, options);
}
