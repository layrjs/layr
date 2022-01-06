import {
  deserialize as simpleDeserialize,
  DeserializeOptions as SimpleDeserializeOptions,
  DeserializeResult
} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {PlainObject} from 'core-helpers';

import type {Component, ComponentSet} from './component';
import type {PropertyFilter, ValueSource} from './properties';
import {Validator, isSerializedValidator} from './validation/validator';
import {isComponentClass} from './utilities';

export type DeserializeOptions = SimpleDeserializeOptions & {
  rootComponent?: typeof Component;
  attributeFilter?: PropertyFilter;
  deserializedComponents?: ComponentSet;
  deserializeFunctions?: boolean;
  source?: ValueSource;
};

/**
 * Deserializes any type of serialized values including objects, arrays, dates, and components.
 *
 * @param value A serialized value.
 * @param [options.rootComponent] The root component of your application.
 * @param [options.attributeFilter] A (possibly async) function used to filter the component attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
 * @param [options.source] The source of the serialization (default: `'local'`).
 *
 * @returns The deserialized value.
 *
 * @example
 * ```
 * // JS
 *
 * import {Component, deserialize} from '﹫layr/component';
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
 * const data = deserialize(serializedData, {rootComponent: Movie});
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
 * import {Component, deserialize} from '﹫layr/component';
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
 * const data = deserialize(serializedData, {rootComponent: Movie});
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
    rootComponent,
    attributeFilter,
    deserializedComponents,
    deserializeFunctions = false,
    source,
    ...otherOptions
  } = options;

  const objectDeserializer = function (object: PlainObject) {
    if (originalObjectDeserializer !== undefined) {
      const deserializedObject = originalObjectDeserializer(object);

      if (deserializedObject !== undefined) {
        return deserializedObject;
      }
    }

    if (isSerializedValidator(object)) {
      return Validator.recreate(object, deserialize);
    }

    const {
      __component: componentType,
      __new: isNew = false,
      ...attributes
    }: {__component?: string; __new?: boolean} & Record<string, any> = object;

    if (componentType === undefined) {
      return undefined;
    }

    if (rootComponent === undefined) {
      throw new Error("Cannot deserialize a component when no 'rootComponent' is provided");
    }

    const componentClassOrPrototype = rootComponent.getComponentOfType(componentType);

    if (isComponentClass(componentClassOrPrototype)) {
      const componentClass = componentClassOrPrototype;

      return componentClass.deserialize(attributes, options);
    }

    const componentPrototype = componentClassOrPrototype;
    const componentClass = componentPrototype.constructor;

    const identifiers = componentPrototype.__createIdentifierSelectorFromObject(attributes);

    const component = componentClass.instantiate(identifiers, {source});

    return possiblyAsync(component, (component) => {
      component.setIsNewMark(isNew);

      if (deserializedComponents !== undefined && !componentClass.isEmbedded()) {
        deserializedComponents.add(component);
      }

      return possiblyAsync(component.__deserializeAttributes(attributes, options), () => {
        if (isNew) {
          for (const attribute of component.getAttributes()) {
            if (!(attribute.isSet() || attribute.isControlled())) {
              attribute.setValue(attribute.evaluateDefault());
            }
          }
        }

        return component;
      });
    });
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
