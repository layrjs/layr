import {
  deserialize as simpleDeserialize,
  DeserializeOptions as SimpleDeserializeOptions
} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {PlainObject} from 'core-helpers';

import type {Component, ComponentGetter} from './component';
import type {PropertyFilter} from './properties';
import {isComponentClass} from './utilities';

export type DeserializeOptions = SimpleDeserializeOptions & {
  componentGetter?: ComponentGetter;
  attributeFilter?: PropertyFilter;
  deserializeFunctions?: boolean;
};

export function deserialize(value: any, options: DeserializeOptions = {}) {
  const {
    objectDeserializer: originalObjectDeserializer,
    functionDeserializer: originalFunctionDeserializer,
    componentGetter,
    attributeFilter,
    deserializeFunctions = false,
    ...otherOptions
  } = options;

  const objectDeserializer = function (object: PlainObject) {
    if (originalObjectDeserializer !== undefined) {
      const deserializedObject = originalObjectDeserializer(object);

      if (deserializedObject !== undefined) {
        return deserializedObject;
      }
    }

    const {__component: componentType, ...attributes} = object;

    if (componentType === undefined) {
      return undefined;
    }

    if (componentGetter === undefined) {
      throw new Error("Cannot deserialize a component without a 'componentGetter'");
    }

    const component = componentGetter(componentType);

    if (isComponentClass(component)) {
      return component.deserialize(attributes, options);
    }

    return (component.constructor as typeof Component).deserializeInstance(attributes, options);
  };

  let functionDeserializer: DeserializeOptions['functionDeserializer'];

  if (deserializeFunctions) {
    functionDeserializer = function (object) {
      if (originalFunctionDeserializer !== undefined) {
        const deserializedFunction = originalFunctionDeserializer(object);

        if (deserializedFunction !== undefined) {
          return deserializedFunction;
        }
      }

      const {__function, ...serializedAttributes} = object;

      if (__function === undefined) {
        return undefined;
      }

      const functionCode = __function;

      return possiblyAsync(
        possiblyAsync.mapValues(serializedAttributes, (attributeValue) =>
          simpleDeserialize(attributeValue, {
            ...otherOptions,
            objectDeserializer,
            functionDeserializer
          })
        ),
        (deserializedAttributes) => {
          const {__context: context} = deserializedAttributes;
          const deserializedFunction = deserializeFunction(functionCode, context);
          Object.assign(deserializedFunction, deserializedAttributes);
          return deserializedFunction;
        }
      );
    };
  }

  return simpleDeserialize(value, {...otherOptions, objectDeserializer, functionDeserializer});
}

export function deserializeFunction(functionCode: string, context?: PlainObject) {
  let evalCode = `(${functionCode});`;

  if (context !== undefined) {
    const contextKeys = Object.keys(context).join(', ');
    const contextCode = `const {${contextKeys}} = context;`;
    evalCode = `${contextCode} ${evalCode}`;
  }

  return eval(evalCode);
}
