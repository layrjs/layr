import {
  serialize as simpleSerialize,
  SerializeOptions as SimpleSerializeOptions
} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {isES2015Class} from 'core-helpers';

import type {Component} from './component';
import type {PropertyFilter, AttributeSelector} from './properties';
import {isComponentClassOrInstance} from './utilities';

export type SerializeOptions = SimpleSerializeOptions & {
  attributeSelector?: AttributeSelector;
  attributeFilter?: PropertyFilter;
  serializeFunctions?: boolean;
  returnComponentReferences?: boolean;
  referencedComponents?: ReferencedComponentSet;
  ignoreEmptyComponents?: boolean;
  includeComponentTypes?: boolean;
  includeIsNewMarks?: boolean;
  includeReferencedComponents?: boolean;
  target?: number;
};

export type ReferencedComponentSet = Set<typeof Component | Component>;

export function serialize(value: any, options: SerializeOptions = {}) {
  const {
    objectSerializer: originalObjectSerializer,
    functionSerializer: originalFunctionSerializer,
    serializeFunctions = false,
    ...otherOptions
  } = options;

  const objectSerializer = function (object: object): object | void {
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

  let functionSerializer: SerializeOptions['functionSerializer'];

  if (serializeFunctions) {
    functionSerializer = function (func) {
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

      return possiblyAsync(
        possiblyAsync.mapValues(func as any, (attributeValue) =>
          simpleSerialize(attributeValue, {...otherOptions, objectSerializer, functionSerializer})
        ),
        (serializedAttributes) => {
          Object.assign(serializedFunction, serializedAttributes);
          return serializedFunction;
        }
      );
    };
  }

  return simpleSerialize(value, {...otherOptions, objectSerializer, functionSerializer});
}

export function serializeFunction(func: Function) {
  return func.toString();
}
