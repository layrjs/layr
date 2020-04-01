import ow from 'ow';

import {isWithRoles} from './utilities';

export function role(name, options = {}) {
  ow(name, 'name', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  return function(target, resolverName, descriptor) {
    ow(target, 'target', ow.object);
    ow(resolverName, 'resolverName', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    const {value: resolver} = descriptor;

    if (!isWithRoles(target)) {
      throw new Error(
        `@role() can only be used on components to which the 'WithRoles' mixin has been applied`
      );
    }

    if (typeof resolver !== 'function') {
      throw new Error(`@role() can only be used on methods`);
    }

    target.setRole(name, resolver, options);

    return descriptor;
  };
}
