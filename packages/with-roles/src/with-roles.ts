import {
  Component,
  isComponentClass,
  isComponentInstance,
  PropertyOperationSetting
} from '@liaison/component';
import {possiblyAsync} from 'possibly-async';
import {hasOwnProperty, getTypeOf, Constructor, PromiseLikeable} from 'core-helpers';

import {Role, RoleResolver} from './role';

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

    static get getRole() {
      return this.prototype.getRole;
    }

    getRole(name: string, options: {fallbackToClass?: boolean} = {}) {
      const {fallbackToClass = false} = options;

      const role = this.__getRole(name, {fallbackToClass});

      if (role === undefined) {
        throw new Error(`The role '${name}' is missing (${this.describeComponent()})`);
      }

      return role;
    }

    static get hasRole() {
      return this.prototype.hasRole;
    }

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

    static get setRole() {
      return this.prototype.setRole;
    }

    setRole(name: string, resolver: RoleResolver): Role {
      const roles = this.__getRoles();

      const role = new Role(name, this, resolver);

      roles[name] = role;

      return role;
    }

    static get resolveRole() {
      return this.prototype.resolveRole;
    }

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
