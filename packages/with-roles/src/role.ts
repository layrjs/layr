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

/**
 * Represents a role in a [`ComponentWithRoles`](https://liaison.dev/docs/v1/reference/with-roles#component-with-roles-class) class or prototype.
 *
 * A role is composed of:
 *
 * - A name.
 * - A parent which should be a [`ComponentWithRoles`](https://liaison.dev/docs/v1/reference/with-roles#component-with-roles-class) class or prototype.
 * - A resolver which should be a function returning a boolean indicating whether a user has the corresponding role.
 *
 * #### Usage
 *
 * Typically, you create a `Role` by using the [`@role()`](https://liaison.dev/docs/v1/reference/with-roles#role-decorator) decorator.
 *
 * See an example of use in the [`WithRoles()`](https://liaison.dev/docs/v1/reference/with-roles#with-roles-mixin) mixin.
 */
export class Role {
  _name: string;
  _parent: typeof ComponentWithRoles | ComponentWithRoles;
  _resolver: RoleResolver;

  /**
   * Creates an instance of [`Role`](https://liaison.dev/docs/v1/reference/role).
   *
   * Typically, instead of using this constructor, you would rather use the [`@role()`](https://liaison.dev/docs/v1/reference/with-roles#role-decorator) decorator.
   *
   * @param name The name of the role.
   * @param parent The parent of the role which should be a [`ComponentWithRoles`](https://liaison.dev/docs/v1/reference/with-roles#component-with-roles-class) class or prototype.
   * @param resolver A function that should return a boolean indicating whether a user has the corresponding role. The function can be asynchronous and is called with the current class or instance as `this` context.
   *
   * @returns The [`Role`](https://liaison.dev/docs/v1/reference/role) instance that was created.
   *
   * @example
   * ```
   * const role = new Role('admin', Article, function () {
   *  // ...
   * });
   * ```
   *
   * @category Creation
   */
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

  /**
   * Returns the name of the role.
   *
   * @returns A string.
   *
   * @category Methods
   */
  getName() {
    return this._name;
  }

  /**
   * Returns the parent of the role.
   *
   * @returns A [`ComponentWithRoles`](https://liaison.dev/docs/v1/reference/with-roles#component-with-roles-class) class or instance.
   *
   * @category Methods
   */
  getParent() {
    return this._parent;
  }

  /**
   * Returns the resolver function of the role.
   *
   * @returns A function.
   *
   * @category Methods
   */
  getResolver() {
    return this._resolver;
  }

  _resolvedValue?: boolean | undefined;
  _hasBeenResolved?: boolean;

  /**
   * Resolves the role by calling its resolver function.
   *
   * The resolver function is called with the role's parent as `this` context.
   *
   * Once a role has been resolved, the result is cached, so the resolver function is called only one time.
   *
   * @returns A boolean.
   *
   * @category Methods
   * @possiblyasync
   */
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

/**
 * Returns whether the specified value is a [`Role`](https://liaison.dev/docs/v1/reference/role) instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRoleInstance(value: any): value is Role {
  return typeof value?.constructor?.isRole === 'function';
}

/**
 * Throws an error if the specified value is not a [`Role`](https://liaison.dev/docs/v1/reference/role) instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsRoleInstance(value: any): asserts value is Role {
  if (!isRoleInstance(value)) {
    throw new Error(`Expected a role instance, but received a value of type '${getTypeOf(value)}'`);
  }
}
