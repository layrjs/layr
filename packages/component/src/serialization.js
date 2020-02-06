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
      propertyFilter: ow.optional.function
    })
  );

  const knownComponentMap = createComponentMap(options?.knownComponents);
  const propertyFilter = options?.propertyFilter;

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

    if (Component === undefined) {
      return undefined;
    }

    const componentName = Component.getName();

    // Make sure the component is known
    getComponentFromComponentMap(knownComponentMap, componentName);

    const serializedComponent = isComponentClass
      ? {__Component: componentName}
      : {__component: componentName, ...(value.isNew() && {__new: true})};

    return possiblyAsync.forEach(
      Object.entries(value),
      ([propertyName, propertyValue]) => {
        const property = value.getProperty(propertyName, {throwIfMissing: false});

        if (property === undefined) {
          return;
        }

        return possiblyAsync(
          propertyFilter !== undefined ? propertyFilter.call(value, property) : true,
          {
            then: isNotFilteredOut => {
              if (isNotFilteredOut) {
                return possiblyAsync(simpleSerialize(propertyValue, options), {
                  then: serializedPropertyValue => {
                    serializedComponent[propertyName] = serializedPropertyValue;
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

  options = {...options, objectHandler};

  return simpleSerialize(value, options);
}
