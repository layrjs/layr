import {deserialize as simpleDeserialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {AttributeSelector} from './attribute-selector';

import {
  isComponentName,
  getComponentClassNameFromComponentInstanceName,
  createComponentMap,
  getComponentFromComponentMap
} from './utilities';

export function deserialize(value, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({
      objectHandler: ow.optional.function,
      functionHandler: ow.optional.function,
      knownComponents: ow.optional.array,
      attributeFilter: ow.optional.function,
      deserializeFunctions: ow.optional.boolean
    })
  );

  const {
    objectHandler: originalObjectHandler,
    functionHandler: originalFunctionHandler,
    knownComponents,
    attributeFilter,
    deserializeFunctions = false
  } = options;

  const knownComponentMap = createComponentMap(knownComponents);

  const objectHandler = function(object) {
    if (originalObjectHandler !== undefined) {
      const deserializedObject = originalObjectHandler(object);

      if (deserializedObject !== undefined) {
        return deserializedObject;
      }
    }

    const {__component, __new, ...attributes} = object;

    if (__component === undefined) {
      return undefined;
    }

    let componentClassName;
    let isComponentClass;

    const isComponentNameResult = isComponentName(__component);

    if (isComponentNameResult === 'componentClassName') {
      // The value is a serialized component class
      componentClassName = __component;
      isComponentClass = true;
    } else if (isComponentNameResult === 'componentInstanceName') {
      // The value is a serialized component instance
      componentClassName = getComponentClassNameFromComponentInstanceName(__component);
      isComponentClass = false;
    } else {
      throw new Error(
        `An invalid component name ('${__component}') was encountered while deserializing an object`
      );
    }

    const Component = getComponentFromComponentMap(knownComponentMap, componentClassName);

    let deserializedComponent;

    if (isComponentClass) {
      deserializedComponent = Component;
    } else if (__new === true) {
      let attributeSelector = Component.prototype.expandAttributeSelector(true, {depth: 0});
      const deserializedAttributeSelector = AttributeSelector.fromNames(Object.keys(attributes));
      attributeSelector = AttributeSelector.remove(
        attributeSelector,
        deserializedAttributeSelector
      );
      deserializedComponent = new Component({}, {attributeSelector});
    } else {
      deserializedComponent = Component.instantiate();
    }

    return possiblyAsync.forEach(
      Object.entries(attributes),
      ([attributeName, attributeValue]) => {
        const attribute = deserializedComponent.getAttribute(attributeName, {
          throwIfMissing: false
        });

        if (attribute === undefined) {
          return;
        }

        return possiblyAsync(
          attributeFilter !== undefined
            ? attributeFilter.call(deserializedComponent, attribute)
            : true,
          {
            then: isNotFilteredOut => {
              if (isNotFilteredOut) {
                return possiblyAsync(simpleDeserialize(attributeValue, options), {
                  then: deserializedAttributeValue => {
                    attribute.setValue(deserializedAttributeValue);
                  }
                });
              }
            }
          }
        );
      },
      {then: () => deserializedComponent}
    );
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
        attributeValue => simpleDeserialize(attributeValue, options),
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

  options = {...options, objectHandler, functionHandler};

  return simpleDeserialize(value, options);
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
