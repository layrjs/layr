import {possiblyAsync} from 'possibly-async';
import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

import {RoleDefinition} from './role-definition';

export const WithRoles = Base =>
  class WithRoles extends Base {
    // === Registrable overriding ===

    static $resolvePropertyOperationSetting(setting) {
      const resolvedSetting = super.$resolvePropertyOperationSetting(setting);

      if (resolvedSetting !== undefined) {
        return resolvedSetting;
      }

      const roles = setting;

      return possiblyAsync.some(roles, role => this.$hasRole(role));
    }

    static $normalizePropertyOperationSetting(setting) {
      let normalizedSetting = super.$normalizePropertyOperationSetting(setting);

      if (normalizedSetting !== undefined) {
        return normalizedSetting;
      }

      normalizedSetting = setting;

      if (typeof normalizedSetting === 'string') {
        normalizedSetting = [normalizedSetting];
      }

      if (
        !(
          Array.isArray(normalizedSetting) &&
          normalizedSetting.every(item => typeof item === 'string')
        )
      ) {
        throw new Error(
          `Invalid property operation setting (${JSON.stringify(normalizedSetting)})`
        );
      }

      normalizedSetting = normalizedSetting.filter(item => item !== '');

      if (normalizedSetting.length === 0) {
        return undefined;
      }

      return normalizedSetting;
    }

    static $serializePropertyOperationSetting(setting) {
      const serializedSetting = super.$serializePropertyOperationSetting(setting);

      if (serializedSetting !== undefined) {
        return serializedSetting;
      }

      return setting;
    }

    // === Static methods ===

    static $hasRole(name) {
      return this.$getRoleDefinition(name).resolve();
    }

    static $getRoleDefinition(name, {throwIfNotFound = true} = {}) {
      const roleDefinitions = this.__getRoleDefinitions();

      let roleDefinition = roleDefinitions[name];

      if (!roleDefinition) {
        if (throwIfNotFound) {
          console.log(roleDefinitions);
          throw new Error(`Role definition not found (name: '${name}')`);
        }
        return undefined;
      }

      if (!hasOwnProperty(roleDefinitions, name)) {
        roleDefinition = roleDefinition.fork(this);
        roleDefinitions[name] = roleDefinition;
      }

      return roleDefinition;
    }

    static $setRoleDefinition(name, resolver, options = {}) {
      ow(name, ow.string.nonEmpty);
      ow(resolver, ow.function);
      ow(options, ow.object);

      const roleDefinitions = this.__getRoleDefinitions();
      const roleDefinition = new RoleDefinition(this, name, resolver, options);
      roleDefinitions[name] = roleDefinition;

      return roleDefinition;
    }

    static $getRoleDefinitions() {
      const withRoles = this;
      return {
        * [Symbol.iterator]() {
          // eslint-disable-next-line guard-for-in
          for (const name in withRoles.__getRoleDefinitions()) {
            yield withRoles.$getRoleDefinition(name);
          }
        }
      };
    }

    static __getRoleDefinitions() {
      if (!this.__roleDefinitions) {
        this.__roleDefinitions = Object.create(null);
      } else if (!hasOwnProperty(this, '__roleDefinitions')) {
        this.__roleDefinitions = Object.create(this.__roleDefinitions);
      }

      return this.__roleDefinitions;
    }

    static $isWithRoles(object) {
      return isWithRoles(object);
    }

    // === Instance methods ===

    $hasRole(name) {
      const roleDefinition = this.$getRoleDefinition(name, {throwIfNotFound: false});

      if (roleDefinition) {
        return roleDefinition.resolve();
      }

      // Fallback to the class if the role definition was not found in the instance
      return this.constructor.$hasRole(name);
    }

    $getRoleDefinition(name, {throwIfNotFound = true} = {}) {
      return this.constructor.$getRoleDefinition.call(this, name, {throwIfNotFound});
    }

    $setRoleDefinition(name, resolver, options = {}) {
      return this.constructor.$setRoleDefinition.call(this, name, resolver, options);
    }

    $getRoleDefinitions() {
      return this.constructor.$getRoleDefinitions.call(this);
    }

    __getRoleDefinitions() {
      return this.constructor.__getRoleDefinitions.call(this);
    }
  };

// === Utilities ===

export function isWithRoles(object) {
  return typeof object?.constructor?.$isWithRoles === 'function';
}

// === Decorators ===

export function role({name: actualName, ...otherOptions} = {}) {
  return function (target, name, descriptor) {
    if (!(isWithRoles(target) || isWithRoles(target.prototype))) {
      throw new Error(`@role() target must be a class using the WithRoles mixin`);
    }

    if (!(name && descriptor)) {
      throw new Error(`@role() must be used to decorate properties`);
    }

    const resolver = descriptor.value;

    if (typeof resolver !== 'function') {
      throw new Error(`@role() must be used to decorate methods`);
    }

    target.$setRoleDefinition(actualName || name, resolver, otherOptions);

    return descriptor;
  };
}
