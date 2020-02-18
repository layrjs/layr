import {serialize as simpleSerialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponent, createComponentMap, getComponentFromComponentMap} from './utilities';

export function serialize(value, options) {
  ow(
    options,
    'options',
    ow.optional.object.partialShape({
      knownComponents: ow.optional.array,
      attributeFilter: ow.optional.function,
      serializeFunctions: ow.optional.boolean
    })
  );

  const knownComponentMap = createComponentMap(options?.knownComponents);
  const attributeFilter = options?.attributeFilter;
  const serializeFunctions = options?.serializeFunctions ?? false;

  const objectHandler = function(object) {
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

function serializeFunction(func) {
  return func.toString();
}
