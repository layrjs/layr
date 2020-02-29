import {serialize as simpleSerialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import {isES2015Class} from 'core-helpers';
import ow from 'ow';

import {
  isComponentClass,
  isComponent,
  getComponentName,
  createComponentMap,
  getComponentFromComponentMap
} from './utilities';

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
    let isClass;

    if (isComponentClass(object)) {
      Component = object;
      isClass = true;
    } else if (isComponent(object)) {
      Component = object.constructor;
      isClass = false;
    } else {
      return undefined;
    }

    // Make sure the component is known
    getComponentFromComponentMap(knownComponentMap, Component.getName());

    const serializedComponent = {__component: getComponentName(object)};

    if (!isClass && object.isNew()) {
      serializedComponent.__new = true;
    }

    return possiblyAsync.forEach(
      object.getAttributes({setAttributesOnly: true}),
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

      if (isES2015Class(func)) {
        throw new Error('Cannot serialize a class');
      }

      const functionCode = serializeFunction(func);

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
