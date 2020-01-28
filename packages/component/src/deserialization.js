import {deserialize as simpleDeserialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponent} from './utilities';

export function deserialize(value, options) {
  ow(options, 'options', ow.optional.object.partialShape({knownComponents: ow.optional.array}));

  const knownComponentMap = generateKnownComponentMap(options?.knownComponents);

  const getComponent = function(name) {
    const Component = knownComponentMap[name];
    if (Component !== undefined) {
      return Component;
    }
    throw new Error(`Cannot find the '${name}' component.`);
  };

  const objectHandler = function(value) {
    const {__Component, __component, __new, ...attributes} = value;

    if (__Component !== undefined) {
      // The value is a serialized component class
      const Component = getComponent(__Component);
      deserializeAttributes(Component, attributes);
      return Component;
    }

    if (__component !== undefined) {
      // The value is a serialized component instance
      const Component = getComponent(__component);
      const component = __new === true ? new Component() : Component.instantiate();
      deserializeAttributes(component, attributes);
      return component;
    }
  };

  const deserializeAttributes = function(target, attributes) {
    return possiblyAsync.forEach(Object.entries(attributes), ([key, value]) =>
      possiblyAsync(simpleDeserialize(value, options), {
        then: deserializedValue => {
          target[key] = deserializedValue;
        }
      })
    );
  };

  options = {...options, objectHandler};

  return simpleDeserialize(value, options);
}

function generateKnownComponentMap(knownComponents = []) {
  const knownComponentMap = Object.create(null);

  for (const knownComponent of knownComponents) {
    if (!isComponent(knownComponent?.prototype)) {
      throw new TypeError(
        `Expected \`knownComponents\` items to be components but received type \`${typeof knownComponent}\``
      );
    }

    knownComponentMap[knownComponent.getName()] = knownComponent;
  }

  return knownComponentMap;
}
