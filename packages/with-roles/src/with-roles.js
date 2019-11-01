import {possiblyAsync} from 'possibly-async';
import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

import {Role} from './role';

export const WithRoles = Base =>
  class WithRoles extends Base {
    // === Registrable overriding ===

    static $resolvePropertyOperationSetting(setting) {
      const resolvedSetting = super.$resolvePropertyOperationSetting(setting);

      if (resolvedSetting !== undefined) {
        return resolvedSetting;
      }

      const roles = setting;

      return possiblyAsync.some(roles, role => this.$resolveRole(role));
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

    static $getRole(name, {throwIfNotFound = true} = {}) {
      const roles = this.__getRoles();

      let role = roles[name];

      if (!role) {
        if (throwIfNotFound) {
          throw new Error(`Role not found (name: '${name}')`);
        }
        return undefined;
      }

      if (!hasOwnProperty(roles, name)) {
        role = role.$fork(this);
        roles[name] = role;
      }

      return role;
    }

    static $setRole(name, resolver, options = {}) {
      ow(name, ow.string.nonEmpty);
      ow(resolver, ow.function);
      ow(options, ow.object);

      const roles = this.__getRoles();
      const role = new Role(this, name, resolver, options);
      roles[name] = role;

      return role;
    }

    static $resolveRole(name) {
      return this.$getRole(name).$resolve();
    }

    static $getRoles() {
      const withRoles = this;
      return {
        * [Symbol.iterator]() {
          // eslint-disable-next-line guard-for-in
          for (const name in withRoles.__getRoles()) {
            yield withRoles.$getRole(name);
          }
        }
      };
    }

    static __getRoles() {
      if (!this.__roles) {
        this.__roles = Object.create(null);
      } else if (!hasOwnProperty(this, '__roles')) {
        this.__roles = Object.create(this.__roles);
      }

      return this.__roles;
    }

    static $isWithRoles(object) {
      return isWithRoles(object);
    }

    // === Instance methods ===

    $getRole(name, {throwIfNotFound = true} = {}) {
      return this.constructor.$getRole.call(this, name, {throwIfNotFound});
    }

    $setRole(name, resolver, options = {}) {
      return this.constructor.$setRole.call(this, name, resolver, options);
    }

    $resolveRole(name) {
      const role = this.$getRole(name, {throwIfNotFound: false});

      if (role) {
        return role.$resolve();
      }

      // Fallback to the class if the role was not found in the instance
      return this.constructor.$resolveRole(name);
    }

    $getRoles() {
      return this.constructor.$getRoles.call(this);
    }

    __getRoles() {
      return this.constructor.__getRoles.call(this);
    }
  };

// === Utilities ===

export function isWithRoles(object) {
  return typeof object?.constructor?.$isWithRoles === 'function';
}

// === Decorators ===

export function role(name, options = {}) {
  return function (target, resolverName, descriptor) {
    if (!(isWithRoles(target) || isWithRoles(target.prototype))) {
      throw new Error(`@role() target must be a class using the WithRoles mixin`);
    }

    if (!(resolverName && descriptor)) {
      throw new Error(`@role() must be used to decorate methods`);
    }

    const resolver = descriptor.value;

    if (typeof resolver !== 'function') {
      throw new Error(`@role() must be used to decorate methods`);
    }

    target.$setRole(name, resolver, options);

    return descriptor;
  };
}
