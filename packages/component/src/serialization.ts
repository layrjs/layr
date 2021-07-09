import {
  serialize as simpleSerialize,
  SerializeOptions as SimpleSerializeOptions,
  SerializeResult
} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {isES2015Class} from 'core-helpers';

import type {ComponentSet} from './component';
import type {PropertyFilter, AttributeSelector, ValueSource} from './properties';
import {isValidatorInstance} from './validation/validator';
import {isComponentClassOrInstance} from './utilities';

export type SerializeOptions = SimpleSerializeOptions & {
  attributeSelector?: AttributeSelector;
  attributeFilter?: PropertyFilter;
  serializedComponents?: ComponentSet;
  componentDependencies?: ComponentSet;
  serializeFunctions?: boolean;
  returnComponentReferences?: boolean;
  ignoreEmptyComponents?: boolean;
  includeComponentTypes?: boolean;
  includeIsNewMarks?: boolean;
  includeReferencedComponents?: boolean;
  target?: ValueSource;
};

/**
 * Serializes any type of values including objects, arrays, dates, and components (using Component's `serialize()` [class method](https://layrjs.com/docs/v1/reference/component#serialize-class-method) and [instance method](https://layrjs.com/docs/v1/reference/component#serialize-instance-method)).
 *
 * @param value A value of any type.
 * @param [options.attributeFilter] A (possibly async) function used to filter the component attributes to be serialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v1/reference/attribute) instance as first argument.
 * @param [options.target] The target of the serialization (default: `undefined`).
 *
 * @returns The serialized value.
 *
 * @example
 * ```
 * import {serialize} from '﹫layr/component';
 *
 * const data = {
 *   createdOn: new Date(),
 *   updatedOn: undefined,
 *   movie: new Movie({title: 'Inception'})
 * };
 *
 * console.log(serialize(data));
 *
 * // Should output something like:
 * // {
 * //   createdOn: {__date: "2020-07-18T23:43:33.778Z"},
 * //   updatedOn: {__undefined: true},
 * //   movie: {__component: 'Movie', title: 'Inception'}
 * // }
 * ```
 *
 * @category Serialization
 * @possiblyasync
 */
export function serialize<Value>(value: Value, options?: SerializeOptions): SerializeResult<Value>;
export function serialize(value: any, options: SerializeOptions = {}) {
  const {
    serializedComponents = new Set(),
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
      return object.serialize({...options, serializedComponents});
    }

    if (isValidatorInstance(object)) {
      return object.serialize(serialize);
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
  let sourceCode = func.toString();

  // Clean functions generated by `new Function()`
  if (sourceCode.startsWith('function anonymous(\n)')) {
    sourceCode = 'function ()' + sourceCode.slice('function anonymous(\n)'.length);
  }

  return sourceCode;
}
