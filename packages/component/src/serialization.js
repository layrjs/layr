import {serialize as simpleSerialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {isES2015Class} from 'core-helpers';
import ow from 'ow';

import {isComponentClassOrInstance} from './utilities';

export function serialize(value, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({
      objectHandler: ow.optional.function,
      functionHandler: ow.optional.function,
      serializeFunctions: ow.optional.boolean
    })
  );

  const {
    objectHandler: originalObjectHandler,
    functionHandler: originalFunctionHandler,
    serializeFunctions = false,
    ...otherOptions
  } = options;

  const objectHandler = function(object) {
    if (originalObjectHandler !== undefined) {
      const serializedObject = originalObjectHandler(object);

      if (serializedObject !== undefined) {
        return serializedObject;
      }
    }

    if (isComponentClassOrInstance(object)) {
      return object.serialize(options);
    }
  };

  let functionHandler;

  if (serializeFunctions) {
    functionHandler = function(func) {
      if (originalFunctionHandler !== undefined) {
        const serializedFunction = originalFunctionHandler(func);

        if (serializedFunction !== undefined) {
          return serializedFunction;
        }
      }

      if (isES2015Class(func)) {
        throw new Error('Cannot serialize a class');
      }

      const functionCode = serializeFunction(func);

      const serializedFunction = {__function: functionCode};

      return possiblyAsync.mapValues(
        func,
        attributeValue =>
          simpleSerialize(attributeValue, {...otherOptions, objectHandler, functionHandler}),
        {
          then: serializedAttributes => {
            Object.assign(serializedFunction, serializedAttributes);
            return serializedFunction;
          }
        }
      );
    };
  }

  return simpleSerialize(value, {...otherOptions, objectHandler, functionHandler});
}

export function serializeFunction(func) {
  return func.toString();
}
