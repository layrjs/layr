import {
  deserialize as simpleDeserialize,
  DeserializeOptions as SimpleDeserializeOptions,
  DeserializeResult
} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {PlainObject} from 'core-helpers';

import type {Component, ComponentSet, ComponentGetter} from './component';
import type {PropertyFilter} from './properties';
import {isComponentClass} from './utilities';

export type DeserializeOptions = SimpleDeserializeOptions & {
  componentGetter?: ComponentGetter;
  attributeFilter?: PropertyFilter;
  deserializedComponents?: ComponentSet;
  deserializeFunctions?: boolean;
  source?: number;
};

/**
 * Deserializes any type of serialized values including objects, arrays, dates, and components (using [`Component.recreate()`](https://liaison.dev/docs/v1/reference/component#recreate-class-method) and [`Component.deserialize()`](https://liaison.dev/docs/v1/reference/component#deserialize-class-method)).
 *
 * @param value A serialized value.
 * @param [options.componentGetter] A function used to get the component classes from the component types encountered in the serialized value. The function is invoked with a string representing a component type and should return a component class or prototype.
 * @param [options.attributeFilter] A (possibly async) function used to filter the component attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://liaison.dev/docs/v1/reference/attribute) instance as first argument.
 * @param [options.source] The source of the serialization (default: `0`).
 *
 * @returns The deserialized value.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, deserialize} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   ﹫attribute('string') title;
 * }
 *
 * const serializedData = {
 *   createdOn: {__date: "2020-07-18T23:43:33.778Z"},
 *   updatedOn: {__undefined: true},
 *   movie: {__component: 'Movie', title: 'Inception'}
 * };
 *
 * const data = deserialize(serializedData, {
 *   componentGetter(type) {
 *     if (type === 'Movie') {
 *       return Movie;
 *     }
 *   }
 * });
 *
 * data.createdOn; // => A Date instance
 * data.updatedOn; // => undefined
 * data.movie; // => A Movie instance
 * ```
 *
 * @example
 * ```
 * // TS
 *
 * import {Component, deserialize} from '﹫liaison/component';
 *
 * class Movie extends Component {
 *   ﹫attribute('string') title!: string;
 * }
 *
 * const serializedData = {
 *   createdOn: {__date: "2020-07-18T23:43:33.778Z"},
 *   updatedOn: {__undefined: true},
 *   movie: {__component: 'Movie', title: 'Inception'}
 * };
 *
 * const data = deserialize(serializedData, {
 *   componentGetter(type: string) {
 *     if (type === 'Movie') {
 *       return Movie;
 *     }
 *   }
 * });
 *
 * data.createdOn; // => A Date instance
 * data.updatedOn; // => undefined
 * data.movie; // => A Movie instance
 * ```
 *
 * @category Deserialization
 * @possiblyasync
 */
export function deserialize<Value>(
  value: Value,
  options?: DeserializeOptions
): DeserializeResult<Value>;
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

    return (component.constructor as typeof Component).recreate(attributes, options);
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
          const deserializedFunction = deserializeFunction(functionCode);
          Object.assign(deserializedFunction, deserializedAttributes);
          return deserializedFunction;
        }
      );
    };
  }

  return simpleDeserialize(value, {...otherOptions, objectDeserializer, functionDeserializer});
}

export function deserializeFunction(functionCode: string): Function {
  return new Function(`return (${functionCode});`)();

  // let evalCode = `(${functionCode});`;

  // if (context !== undefined) {
  //   const contextKeys = Object.keys(context).join(', ');
  //   const contextCode = `const {${contextKeys}} = context;`;
  //   evalCode = `${contextCode} ${evalCode}`;
  // }

  // return eval(evalCode);
}
