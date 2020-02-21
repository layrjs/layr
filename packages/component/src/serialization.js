import {serialize as simpleSerialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponent, createComponentMap, getComponentFromComponentMap} from './utilities';

export function serialize(value, options = {}) {
  ow(
    options,
    'options',
    ow.object.partialShape({
      objectHandler: ow.optional.function,
      functionHandler: ow.optional.function,
      knownComponents: ow.optional.array,
      attributeFilter: ow.optional.function,
      serializeFunctions: ow.optional.boolean
    })
  );

  const {
    objectHandler: originalObjectHandler,
    functionHandler: originalFunctionHandler,
    knownComponents,
    attributeFilter,
    serializeFunctions = false
  } = options;

  const knownComponentMap = createComponentMap(knownComponents);

  const objectHandler = function(object) {
    if (originalObjectHandler !== undefined) {
      const serializedObject = originalObjectHandler(object);

      if (serializedObject !== undefined) {
        return serializedObject;
      }
    }

    let Component;
    let isComponentClass;

    if (isComponent(object.prototype)) {
      // The object is a component class
      Component = object;
      isComponentClass = true;
    } else if (isComponent(object)) {
      // The object is a component instance
      Component = object.constructor;
      isComponentClass = false;
    }

    if (Component === undefined) {
      return undefined;
    }

    const componentName = Component.getName();

    // Make sure the component is known
    getComponentFromComponentMap(knownComponentMap, componentName);

    const serializedComponent = isComponentClass
      ? {__Component: componentName}
      : {__component: componentName, ...(object.isNew() && {__new: true})};

    return possiblyAsync.forEach(
      object.getActiveAttributes(),
      attribute => {
        return possiblyAsync(
          attributeFilter !== undefined ? attributeFilter.call(object, attribute) : true,
          {
            then: isNotFilteredOut => {
              if (isNotFilteredOut) {
                const attributeName = attribute.getName();
                const attributeValue = attribute.getValue();
                return possiblyAsync(simpleSerialize(attributeValue, options), {
                  then: serializedAttributeValue => {
                    serializedComponent[attributeName] = serializedAttributeValue;
                  }
                });
              }
            }
          }
        );
      },
      {then: () => serializedComponent}
    );
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

      const functionCode = serializeFunction(func);

      if (functionCode.startsWith('class')) {
        throw new Error('Cannot serialize a class');
      }

      const serializedFunction = {__function: functionCode};

      return possiblyAsync.mapValues(
        func,
        attributeValue => simpleSerialize(attributeValue, options),
        {
          then: serializedAttributes => {
            Object.assign(serializedFunction, serializedAttributes);
            return serializedFunction;
          }
        }
      );
    };
  }

  options = {...options, objectHandler, functionHandler};

  return simpleSerialize(value, options);
}

export function serializeFunction(func) {
  return func.toString();
}
