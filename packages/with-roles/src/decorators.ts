import {ComponentWithRoles} from './with-roles';
import {isComponentWithRolesClassOrInstance} from './utilities';

/**
 * Defines a [role](https://layrjs.com/docs/v1/reference/role) in a [`ComponentWithRoles`](https://layrjs.com/docs/v1/reference/with-roles#component-with-roles-class) class or prototype.
 *
 * This decorator should be used to decorate a class or instance method that implements the role's resolver. The method can be asynchronous and should return a boolean indicating whether a user has the corresponding role.
 *
 * @param name The name of the role to define.
 *
 * @examplelink See an example of use in the [`WithRoles()`](https://layrjs.com/docs/v1/reference/with-roles#with-roles-mixin) mixin.
 *
 * @category Decorators
 * @decorator
 */
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
