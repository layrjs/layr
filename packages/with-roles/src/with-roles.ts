import {
  Component,
  isComponentClass,
  isComponentInstance,
  PropertyOperationSetting
} from '@layr/component';
import {possiblyAsync} from 'possibly-async';
import {hasOwnProperty, getTypeOf, Constructor, PromiseLikeable} from 'core-helpers';

import {Role, RoleResolver} from './role';

/**
 * Extends a [`Component`](https://layrjs.com/docs/v2/reference/component) class with the ability to handle [roles](https://layrjs.com/docs/v2/reference/role).
 *
 * #### Usage
 *
 * Call `WithRoles()` with a [`Component`](https://layrjs.com/docs/v2/reference/component) class to construct a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class. Next, use the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator to define some [roles](https://layrjs.com/docs/v2/reference/role). Lastly, use the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) decorator to authorize some attributes or methods according to these roles.
 *
 * **Example:**
 *
 * ```
 * import {Component, attribute, method, expose} from '@layr/component';
 * import {WithRoles, role} from '@layr/with-roles';
 *
 * class Article extends WithRoles(Component) {
 *   ﹫role('admin') static adminRoleResolver() {
 *     // ...
 *   }
 *
 *   // Only readable by an administrator
 *   ﹫expose({get: 'admin'}) ﹫attribute('number') viewCount = 0;
 *
 *   // Only callable by an administrator
 *   ﹫expose({call: 'admin'}) ﹫method() unpublish() {
 *     // ...
 *   }
 * }
 * ```
 *
 * Once you have a [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class), you can use any method provided by the `WithRoles()` mixin. For example, you can use the [`resolveRole()`](https://layrjs.com/docs/v2/reference/with-roles#resolve-role-dual-method) method to determine if the user has a specific role:
 *
 * ```
 * Article.resolveRole('admin'); // `true` or `false` depending on the current user
 * ```
 *
 * See the ["Handling Authorization"](https://layrjs.com/docs/v2/introduction/handling-authorization) tutorial for a comprehensive example using the `WithRoles()` mixin.
 *
 * ### ComponentWithRoles <badge type="primary">class</badge> {#component-with-roles-class}
 *
 * *Inherits from [`Component`](https://layrjs.com/docs/v2/reference/component).*
 *
 * A `ComponentWithRoles` class is constructed by calling the `WithRoles()` mixin ([see above](https://layrjs.com/docs/v2/reference/with-roles#with-roles-mixin)).
 *
 * @mixin
 */
export function WithRoles<T extends Constructor<typeof Component>>(Base: T) {
  if (!isComponentClass(Base)) {
    throw new Error(
      `The WithRoles mixin should be applied on a component class (received type: '${getTypeOf(
        Base
      )}')`
    );
  }

  if (typeof (Base as any).getRole === 'function') {
    return Base as T & typeof WithRoles;
  }

  class WithRoles extends Base {
    static normalizePropertyOperationSetting(
      setting: PropertyOperationSetting,
      options: {throwIfInvalid?: boolean} = {}
    ): PropertyOperationSetting | undefined {
      const {throwIfInvalid = true} = options;

      let normalizedSetting = super.normalizePropertyOperationSetting(setting, {
        throwIfInvalid: false
      });

      if (normalizedSetting !== undefined) {
        return normalizedSetting;
      }

      normalizedSetting = setting;

      if (typeof normalizedSetting === 'string') {
        normalizedSetting = [normalizedSetting];
      }

      if (
        Array.isArray(normalizedSetting) &&
        normalizedSetting.every((item) => typeof item === 'string')
      ) {
        normalizedSetting = normalizedSetting.filter((item) => item !== '');

        if (normalizedSetting.length === 0) {
          return undefined;
        }

        return normalizedSetting;
      }

      if (throwIfInvalid) {
        throw new Error(
          `The specified property operation setting (${JSON.stringify(setting)}) is invalid`
        );
      }

      return undefined;
    }

    resolvePropertyOperationSetting(
      setting: PropertyOperationSetting
    ): PromiseLikeable<boolean | undefined> {
      const resolvedSetting = super.resolvePropertyOperationSetting(setting);

      if (resolvedSetting !== undefined) {
        return resolvedSetting;
      }

      const roles = setting as string[];

      return possiblyAsync.some(roles, (role) => this.resolveRole(role));
    }

    // === Roles ===

    /**
     * Gets a role. If there is no role with the specified name, an error is thrown.
     *
     * @param name The name of the role to get.
     * @param [options.fallbackToClass] A boolean specifying whether the role should be get from the component class if there is no role with the specified name in the component prototype or instance (default: `false`).
     *
     * @returns A [Role](https://layrjs.com/docs/v2/reference/role) instance.
     *
     * @example
     * ```
     * Article.getRole('admin'); // => 'admin' role
     *
     * const article = new Article();
     * article.getRole('admin'); // Error
     * article.getRole('admin', {fallbackToClass: true}); // => 'admin' role
     * ```
     *
     * @category Roles
     */
    static get getRole() {
      return this.prototype.getRole;
    }

    /**
     * Gets a role. If there is no role with the specified name, an error is thrown.
     *
     * @param name The name of the role to get.
     * @param [options.fallbackToClass] A boolean specifying whether the role should be get from the component class if there is no role with the specified name in the component prototype or instance (default: `false`).
     *
     * @returns A [Role](https://layrjs.com/docs/v2/reference/role) instance.
     *
     * @example
     * ```
     * Article.getRole('admin'); // => 'admin' role
     *
     * const article = new Article();
     * article.getRole('admin'); // Error
     * article.getRole('admin', {fallbackToClass: true}); // => 'admin' role
     * ```
     *
     * @category Roles
     */
    getRole(name: string, options: {fallbackToClass?: boolean} = {}) {
      const {fallbackToClass = false} = options;

      const role = this.__getRole(name, {fallbackToClass});

      if (role === undefined) {
        throw new Error(`The role '${name}' is missing (${this.describeComponent()})`);
      }

      return role;
    }

    /**
     * Returns whether the [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) has a role with the specified name.
     *
     * @param name The name of the role to check.
     * @param [options.fallbackToClass] A boolean specifying whether the component class should be considered if there is no role with the specified name in the component prototype or instance (default: `false`).
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasRole('admin'); // => true
     *
     * const article = new Article();
     * article.hasRole('admin'); // => false
     * article.hasRole('admin', {fallbackToClass: true}); // => true
     * ```
     *
     * @category Roles
     */
    static get hasRole() {
      return this.prototype.hasRole;
    }

    /**
     * Returns whether the [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) has a role with the specified name.
     *
     * @param name The name of the role to check.
     * @param [options.fallbackToClass] A boolean specifying whether the component class should be considered if there is no role with the specified name in the component prototype or instance (default: `false`).
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasRole('admin'); // => true
     *
     * const article = new Article();
     * article.hasRole('admin'); // => false
     * article.hasRole('admin', {fallbackToClass: true}); // => true
     * ```
     *
     * @category Roles
     */
    hasRole(name: string, options: {fallbackToClass?: boolean} = {}) {
      const {fallbackToClass = false} = options;

      return this.__getRole(name, {fallbackToClass}) !== undefined;
    }

    static get __getRole() {
      return this.prototype.__getRole;
    }

    __getRole(name: string, {fallbackToClass}: {fallbackToClass: boolean}): Role | undefined {
      const roles = this.__getRoles();

      let role = roles[name];

      if (role !== undefined) {
        if (!hasOwnProperty(roles, name)) {
          role = role.fork(this);
          roles[name] = role;
        }

        return role;
      }

      if (isComponentInstance(this) && fallbackToClass) {
        return this.__getRole.call(this.constructor, name, {fallbackToClass});
      }

      return undefined;
    }

    /**
     * Sets a role in the current [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.
     *
     * Typically, instead of using this method, you would rather use the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator.
     *
     * @param name The name of the role.
     * @param resolver A function that should return a boolean indicating whether a user has the corresponding role. The function can be asynchronous and is called with the role's parent as `this` context.
     *
     * @returns The [Role](https://layrjs.com/docs/v2/reference/role) instance that was created.
     *
     * @example
     * ```
     * Article.setRole('admin', function () {
     *  // ...
     * });
     * ```
     *
     * @category Roles
     */
    static get setRole() {
      return this.prototype.setRole;
    }

    /**
     * Sets a role in the current [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype.
     *
     * Typically, instead of using this method, you would rather use the [`@role()`](https://layrjs.com/docs/v2/reference/with-roles#role-decorator) decorator.
     *
     * @param name The name of the role.
     * @param resolver A function that should return a boolean indicating whether a user has the corresponding role. The function can be asynchronous and is called with the role's parent as `this` context.
     *
     * @returns The [Role](https://layrjs.com/docs/v2/reference/role) instance that was created.
     *
     * @example
     * ```
     * Article.setRole('admin', function () {
     *  // ...
     * });
     * ```
     *
     * @category Roles
     */
    setRole(name: string, resolver: RoleResolver): Role {
      const roles = this.__getRoles();

      const role = new Role(name, this, resolver);

      roles[name] = role;

      return role;
    }

    /**
     * Resolves a role by calling its resolver function. If there is no role with the specified name in the [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype, an error is thrown.
     *
     * The resolver function is called with the role's parent as `this` context.
     *
     * Once a role has been resolved, the result is cached, so the resolver function is called only one time.
     *
     * @param name The name of the role to resolve.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.resolveRole('admin'); // `true` or `false` depending on the current user
     * ```
     *
     * @category Roles
     * @possiblyasync
     */
    static get resolveRole() {
      return this.prototype.resolveRole;
    }

    /**
     * Resolves a role by calling its resolver function. If there is no role with the specified name in the [`ComponentWithRoles`](https://layrjs.com/docs/v2/reference/with-roles#component-with-roles-class) class or prototype, an error is thrown.
     *
     * The resolver function is called with the role's parent as `this` context.
     *
     * Once a role has been resolved, the result is cached, so the resolver function is called only one time.
     *
     * @param name The name of the role to resolve.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.resolveRole('admin'); // `true` or `false` depending on the current user
     * ```
     *
     * @category Roles
     * @possiblyasync
     */
    resolveRole(name: string) {
      return this.getRole(name, {fallbackToClass: true}).resolve();
    }

    static get getRoles() {
      return this.prototype.getRoles;
    }

    getRoles() {
      const withRoles = this;

      return {
        *[Symbol.iterator]() {
          for (const name in withRoles.__getRoles()) {
            yield withRoles.getRole(name);
          }
        }
      };
    }

    static __roles: {[name: string]: Role};

    static get __getRoles() {
      return this.prototype.__getRoles;
    }

    __roles!: {[name: string]: Role};

    __getRoles() {
      if (this.__roles === undefined) {
        this.__roles = Object.create(null);
      } else if (!hasOwnProperty(this, '__roles')) {
        this.__roles = Object.create(this.__roles);
      }

      return this.__roles;
    }
  }

  return WithRoles;
}

export class ComponentWithRoles extends WithRoles(Component) {}
