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
      objectSerializer: ow.optional.function,
      functionSerializer: ow.optional.function,
      serializeFunctions: ow.optional.boolean
    })
  );

  const {
    objectSerializer: originalObjectSerializer,
    functionSerializer: originalFunctionSerializer,
    serializeFunctions = false,
    ...otherOptions
  } = options;

  const objectSerializer = function(object) {
    if (originalObjectSerializer !== undefined) {
      const serializedObject = originalObjectSerializer(object);

      if (serializedObject !== undefined) {
        return serializedObject;
      }
    }

    if (isComponentClassOrInstance(object)) {
      return object.serialize(options);
    }
  };

  let functionSerializer;

  if (serializeFunctions) {
    functionSerializer = function(func) {
      if (originalFunctionSerializer !== undefined) {
        const serializedFunction = originalFunctionSerializer(func);

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
          simpleSerialize(attributeValue, {...otherOptions, objectSerializer, functionSerializer}),
        {
          then: serializedAttributes => {
            Object.assign(serializedFunction, serializedAttributes);
            return serializedFunction;
          }
        }
      );
    };
  }

  return simpleSerialize(value, {...otherOptions, objectSerializer, functionSerializer});
}

export function serializeFunction(func) {
  return func.toString();
}
