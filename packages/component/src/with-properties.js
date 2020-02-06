import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

import {Property} from './property';

export const WithProperties = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  class CommonWithProperties extends Base {}

  const commonMethods = {
    // === Property items ===

    getProperty(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      const properties = this.__getProperties();

      let property = properties[name];

      if (property === undefined) {
        if (throwIfMissing) {
          throw new Error(`The property '${name}' is missing`);
        }
        return undefined;
      }

      if (autoFork && property.getParent() !== this) {
        property = property.fork(this);
        properties[name] = property;
      }

      return property;
    },

    setProperty(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object);

      let property = this.getProperty(name, {throwIfMissing: false});

      if (property === undefined) {
        property = new Property(name, this, options);
        const properties = this.__getProperties();
        properties[name] = property;
      } else {
        property.setOptions(options);
      }

      return property;
    },

    hasProperty(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getProperty(name, {autoFork: false, throwIfMissing: false}) !== undefined;
    },

    // === Property collection ===

    getProperties(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter, autoFork = true} = options;

      const component = this;

      return {
        *[Symbol.iterator]() {
          for (const name of component.getPropertyNames()) {
            const property = component.getProperty(name, {autoFork});

            if (filter !== undefined && !filter.call(this, property)) {
              continue;
            }

            yield property;
          }
        }
      };
    },

    getPropertyNames() {
      const names = [];

      let currentObject = this;
      while ('__properties' in currentObject) {
        if (hasOwnProperty(currentObject, '__properties')) {
          const currentNames = Object.getOwnPropertyNames(currentObject.__properties);
          names.unshift(...currentNames);
        }
        currentObject = Object.getPrototypeOf(currentObject);
      }

      return Array.from(new Set(names));
    },

    __getProperties({autoCreateOrFork = true} = {}) {
      if (autoCreateOrFork) {
        if (!('__properties' in this)) {
          Object.defineProperty(this, '__properties', {value: Object.create(null)});
        } else if (!hasOwnProperty(this, '__properties')) {
          Object.defineProperty(this, '__properties', {value: Object.create(this.__properties)});
        }
      }

      return this.__properties;
    },

    // === Property exposure ===

    resolvePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    },

    normalizePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    },

    serializePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    }
  };

  Object.assign(CommonWithProperties, commonMethods);
  Object.assign(CommonWithProperties.prototype, commonMethods);

  class WithProperties extends CommonWithProperties {
    static isWithProperties(object) {
      return isWithProperties(object);
    }
  }

  return WithProperties;
};

export function isWithProperties(object) {
  return typeof object?.constructor?.isWithProperties === 'function';
}

export function property(options = {}) {
  ow(options, 'options', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isWithProperties(target) || isWithProperties(target.prototype))) {
      throw new Error(`@property() target doesn't inherit from WithProperties`);
    }

    target.setProperty(name, options);

    return descriptor;
  };
}

export function expose(exposure = {}) {
  ow(exposure, 'exposure', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isWithProperties(target) || isWithProperties(target.prototype))) {
      throw new Error(`@expose() target doesn't inherit from WithProperties`);
    }

    const property = target.setProperty(name);

    property.setExposure(exposure);

    return descriptor;
  };
}
