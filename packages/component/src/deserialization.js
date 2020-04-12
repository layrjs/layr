import {deserialize as simpleDeserialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {AttributeSelector} from './attribute-selector';
import {isComponentClass} from './utilities';

export function deserialize(value, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({
      objectDeserializer: ow.optional.function,
      functionDeserializer: ow.optional.function,
      componentGetter: ow.optional.function,
      attributeFilter: ow.optional.function,
      deserializeFunctions: ow.optional.boolean
    })
  );

  const {
    objectDeserializer: originalObjectDeserializer,
    functionDeserializer: originalFunctionDeserializer,
    componentGetter,
    attributeFilter,
    deserializeFunctions = false,
    ...otherOptions
  } = options;

  const objectDeserializer = function(object) {
    if (originalObjectDeserializer !== undefined) {
      const deserializedObject = originalObjectDeserializer(object);

      if (deserializedObject !== undefined) {
        return deserializedObject;
      }
    }

    const {__component: componentName, __new: isNew = false, ...attributes} = object;

    if (componentName === undefined) {
      return undefined;
    }

    if (componentGetter === undefined) {
      throw new Error("Cannot deserialize a component without a 'componentGetter'");
    }

    const component = componentGetter(componentName);

    if (isComponentClass(component)) {
      return component.deserialize(attributes, options);
    }

    const {identifierAttributes, otherAttributes} = component.__partitionAttributes(attributes);

    let attributeSelector;

    if (isNew) {
      // When deserializing a component, we must select the attributes that are not part
      // of the deserialization so they can be set to their default values
      attributeSelector = component.expandAttributeSelector(true, {depth: 0});
      const otherAttributeSelector = AttributeSelector.fromNames(Object.keys(otherAttributes));
      attributeSelector = AttributeSelector.remove(attributeSelector, otherAttributeSelector);
    } else {
      attributeSelector = {};
    }

    return possiblyAsync(
      component.constructor.instantiate(identifierAttributes, {
        isNew,
        attributeSelector,
        attributeFilter
      }),
      {
        then: instantiatedComponent =>
          instantiatedComponent.deserialize({__new: isNew, ...attributes}, options)
      }
    );
  };

  let functionDeserializer;

  if (deserializeFunctions) {
    functionDeserializer = function(object) {
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

      return possiblyAsync.mapValues(
        serializedAttributes,
        attributeValue =>
          simpleDeserialize(attributeValue, {
            ...otherOptions,
            objectDeserializer,
            functionDeserializer
          }),
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

  return simpleDeserialize(value, {...otherOptions, objectDeserializer, functionDeserializer});
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
