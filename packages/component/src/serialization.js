import {serialize as simpleSerialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponent, createComponentMap, getComponentFromComponentMap} from './utilities';

export function serialize(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({knownComponents: ow.optional.array}));

  const knownComponentMap = createComponentMap(options?.knownComponents);

  const objectHandler = function(value) {
    let Component;
    let isComponentClass;

    if (isComponent(value.prototype)) {
      // The value is a component class
      Component = value;
      isComponentClass = true;
    } else if (isComponent(value)) {
      // The value is a component instance
      Component = value.constructor;
      isComponentClass = false;
    }

    if (!Component) {
      return undefined;
    }

    const componentName = Component.getName();

    // Make sure the component is known
    getComponentFromComponentMap(knownComponentMap, componentName);

    return possiblyAsync.mapObject(
      value,
      propertyValue => simpleSerialize(propertyValue, options),
      {
        then: serializedAttributes => {
          return isComponentClass
            ? {
                __Component: componentName,
                ...serializedAttributes
              }
            : {
                __component: componentName,
                ...(value.isNew() && {__new: true}),
                ...serializedAttributes
              };
        }
      }
    );
  };

  options = {...options, objectHandler};

  return simpleSerialize(value, options);
}
