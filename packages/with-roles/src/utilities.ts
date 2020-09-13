import {getTypeOf} from 'core-helpers';

import type {ComponentWithRoles} from './with-roles';

/**
 * Returns whether the specified value is a [`ComponentWithRoles`](https://liaison.dev/docs/v1/reference/with-roles#component-with-roles-class) class or instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isComponentWithRolesClassOrInstance(
  value: any
): value is typeof ComponentWithRoles | ComponentWithRoles {
  return typeof value?.getRole === 'function';
}

/**
 * Throws an error if the specified value is not a [`ComponentWithRoles`](https://liaison.dev/docs/v1/reference/with-roles#component-with-roles-class) class or instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsComponentWithRolesClassOrInstance(
  value: any
): asserts value is typeof ComponentWithRoles | ComponentWithRoles {
  if (!isComponentWithRolesClassOrInstance(value)) {
    throw new Error(
      `Expected a component with roles class or instance, but received a value of type '${getTypeOf(
        value
      )}'`
    );
  }
}
