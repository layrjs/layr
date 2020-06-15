import {getTypeOf} from 'core-helpers';

import type {ComponentWithRoles} from './with-roles';
import type {Role} from './role';

export function isComponentWithRolesClassOrInstance(
  value: any
): value is typeof ComponentWithRoles | ComponentWithRoles {
  return typeof value?.getRole === 'function';
}

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

export function isRoleInstance(value: any): value is Role {
  return typeof value?.constructor?.isRole === 'function';
}

export function assertIsRoleInstance(value: any): asserts value is Role {
  if (!isRoleInstance(value)) {
    throw new Error(`Expected a role instance, but received a value of type '${getTypeOf(value)}'`);
  }
}
