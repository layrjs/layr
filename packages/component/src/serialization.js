import {serialize as simpleSerialize} from 'simple-serialization';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';

import {isComponent} from './utilities';

export function serialize(value, options) {
  ow(options, 'options', ow.optional.object);

  const objectHandler = function(value) {
    if (isComponent(value.prototype)) {
      // The value is a component class
      return {
        __Component: value.getName(),
        ...serializeAttributes(value)
      };
    }

    if (isComponent(value)) {
      // The value is a component instance
      return {
        __component: value.constructor.getName(),
        ...(value.isNew() && {__new: true}),
        ...serializeAttributes(value)
      };
    }
  };

  const serializeAttributes = function(source) {
    return possiblyAsync.mapObject(source, value => simpleSerialize(value, options));
  };

  options = {...options, objectHandler};

  return simpleSerialize(value, options);
}
