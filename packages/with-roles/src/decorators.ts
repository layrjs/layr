import {ComponentWithRoles} from './with-roles';
import {isComponentWithRolesClassOrInstance} from './utilities';

export function role(name: string) {
  return function (
    target: typeof ComponentWithRoles | ComponentWithRoles,
    _key: string,
    descriptor: PropertyDescriptor
  ) {
    const {value: resolver, enumerable} = descriptor;

    if (
      !(
        isComponentWithRolesClassOrInstance(target) &&
        typeof resolver === 'function' &&
        enumerable === false
      )
    ) {
      throw new Error(
        `@role() should be used to decorate a component with roles method (property: '${name}')`
      );
    }

    target.setRole(name, resolver);
  };
}
