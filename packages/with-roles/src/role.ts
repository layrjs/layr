import {possiblyAsync} from 'possibly-async';
import {
  isPrototypeOf,
  assertIsString,
  assertIsFunction,
  PromiseLikeable,
  getTypeOf
} from 'core-helpers';
import {inspect} from 'util';

import type {ComponentWithRoles} from './with-roles';
import {assertIsComponentWithRolesClassOrInstance} from './utilities';

export type RoleResolver = () => PromiseLikeable<boolean | undefined>;

export class Role {
  _name: string;
  _parent: typeof ComponentWithRoles | ComponentWithRoles;
  _resolver: RoleResolver;

  constructor(
    name: string,
    parent: typeof ComponentWithRoles | ComponentWithRoles,
    resolver: RoleResolver
  ) {
    assertIsString(name);
    assertIsComponentWithRolesClassOrInstance(parent);
    assertIsFunction(resolver);

    this._name = name;
    this._parent = parent;
    this._resolver = resolver;
  }

  getName() {
    return this._name;
  }

  getParent() {
    return this._parent;
  }

  getResolver() {
    return this._resolver;
  }

  _resolvedValue?: boolean | undefined;
  _hasBeenResolved?: boolean;

  resolve(): PromiseLikeable<boolean | undefined> {
    if (this._hasBeenResolved) {
      return this._resolvedValue;
    }

    return possiblyAsync(this._resolver.call(this._parent), (resolvedValue) => {
      this._resolvedValue = resolvedValue;
      this._hasBeenResolved = true;
      return resolvedValue;
    });
  }

  fork(parent: typeof ComponentWithRoles | ComponentWithRoles) {
    const forkedRole = Object.create(this) as Role;

    forkedRole._parent = parent;

    return forkedRole;
  }

  isForkOf(role: Role) {
    assertIsRoleInstance(role);

    return isPrototypeOf(role, this);
  }

  static isRole(value: any): value is Role {
    return isRoleInstance(value);
  }

  [inspect.custom]() {
    return {name: this._name, resolver: this._resolver};
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
