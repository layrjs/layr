import {deserialize as simpleDeserialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

export function deserialize(value, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({
      objectHandler: ow.optional.function,
      functionHandler: ow.optional.function,
      componentGetter: ow.optional.function,
      deserializeFunctions: ow.optional.boolean
    })
  );

  const {
    objectHandler: originalObjectHandler,
    functionHandler: originalFunctionHandler,
    componentGetter,
    deserializeFunctions = false,
    ...otherOptions
  } = options;

  const objectHandler = function(object) {
    if (originalObjectHandler !== undefined) {
      const deserializedObject = originalObjectHandler(object);

      if (deserializedObject !== undefined) {
        return deserializedObject;
      }
    }

    const {__component: componentName} = object;

    if (componentName === undefined) {
      return undefined;
    }

    if (componentGetter === undefined) {
      throw new Error("Cannot deserialize a component without a 'componentGetter'");
    }

    const component = componentGetter(componentName);

    return component.deserialize(object, options);
  };

  let functionHandler;

  if (deserializeFunctions) {
    functionHandler = function(object) {
      if (originalFunctionHandler !== undefined) {
        const deserializedFunction = originalFunctionHandler(object);

        if (deserializedFunction !== undefined) {
          return deserializedFunction;
        }
      }

      const {__function, ...serializedAttributes} = object;

      if (__function === undefined) {
        return undefined;
      }

      const functionCode = __function;

      return possiblyAsync.mapValues(
        serializedAttributes,
        attributeValue =>
          simpleDeserialize(attributeValue, {...otherOptions, objectHandler, functionHandler}),
        {
          then: deserializedAttributes => {
            const {__context: context} = deserializedAttributes;
            const deserializedFunction = deserializeFunction(functionCode, context);
            Object.assign(deserializedFunction, deserializedAttributes);
            return deserializedFunction;
          }
        }
      );
    };
  }

  return simpleDeserialize(value, {...otherOptions, objectHandler, functionHandler});
}

export function deserializeFunction(functionCode, context) {
  let evalCode = `(${functionCode});`;

  if (context !== undefined) {
    const contextKeys = Object.keys(context).join(', ');
    const contextCode = `const {${contextKeys}} = context;`;
    evalCode = `${contextCode} ${evalCode}`;
  }

  // eslint-disable-next-line no-eval
  return eval(evalCode);
}
