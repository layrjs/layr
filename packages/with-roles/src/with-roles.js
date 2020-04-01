import {possiblyAsync} from 'possibly-async';
import {hasOwnProperty, isClass, isInstance, getClassOf, getTypeOf} from 'core-helpers';
import ow from 'ow';

import {Role} from './role';
import {isWithRoles} from './utilities';

export const WithRoles = Base => {
  if (isClass(Base) && isWithRoles(Base)) {
    return Base;
  }

  if (typeof Base?.isComponent !== 'function') {
    throw new Error(
      `The WithRoles mixin can only be applied on component classes (received type: '${getTypeOf(
        Base
      )}')`
    );
  }

  class WithRoles extends Base {
    static normalizePropertyOperationSetting(setting, options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfInvalid: ow.optional.boolean}));

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
        normalizedSetting.every(item => typeof item === 'string')
      ) {
        normalizedSetting = normalizedSetting.filter(item => item !== '');

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
    }

    static __resolvePropertyOperationSetting(setting) {
      const resolvedSetting = super.resolvePropertyOperationSetting(setting);

      if (resolvedSetting !== undefined) {
        return resolvedSetting;
      }

      const roles = setting;

      return possiblyAsync.some(roles, role => this.resolveRole(role));
    }
  }

  const classAndInstanceMethods = {
    resolvePropertyOperationSetting(setting) {
      return getClassOf(this).__resolvePropertyOperationSetting.call(this, setting);
    },

    // === Roles ===

    getRole(name, options = {}) {
      ow(name, ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({
          throwIfMissing: ow.optional.boolean,
          fallbackToClass: ow.optional.boolean
        })
      );

      const {throwIfMissing = true, fallbackToClass = false} = options;

      const roles = this.__getRoles();

      let role = roles[name];

      if (role !== undefined) {
        if (!hasOwnProperty(roles, name)) {
          role = role.fork(this);
          roles[name] = role;
        }

        return role;
      }

      if (isInstance(this) && fallbackToClass) {
        return this.constructor.getRole(name, {throwIfMissing});
      }

      if (throwIfMissing) {
        throw new Error(`The role '${name}' is missing (${this.describeComponent()})`);
      }
    },

    setRole(name, resolver, options = {}) {
      ow(name, ow.string.nonEmpty);
      ow(resolver, ow.function);
      ow(options, ow.object);

      const roles = this.__getRoles();

      const role = new Role(this, name, resolver, options);

      roles[name] = role;

      return role;
    },

    resolveRole(name) {
      ow(name, ow.string.nonEmpty);

      return this.getRole(name, {fallbackToClass: true}).resolve();
    },

    getRoles() {
      const withRoles = this;

      return {
        *[Symbol.iterator]() {
          // eslint-disable-next-line guard-for-in
          for (const name in withRoles.__getRoles()) {
            yield withRoles.getRole(name);
          }
        }
      };
    },

    __getRoles() {
      if (!this.__roles) {
        this.__roles = Object.create(null);
      } else if (!hasOwnProperty(this, '__roles')) {
        this.__roles = Object.create(this.__roles);
      }

      return this.__roles;
    },

    // === Utilities ===

    isWithRoles(object) {
      return isWithRoles(object);
    }
  };

  Object.assign(WithRoles, classAndInstanceMethods);
  Object.assign(WithRoles.prototype, classAndInstanceMethods);

  return WithRoles;
};
