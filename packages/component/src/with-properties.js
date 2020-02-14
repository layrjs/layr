import {hasOwnProperty, getInheritedPropertyDescriptor} from 'core-helpers';
import ow from 'ow';

import {Attribute, isAttribute} from './attribute';
import {Method, isMethod} from './method';

export const WithProperties = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  class CommonWithProperties extends Base {}

  const commonMethods = {
    // === Properties ===

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

    setProperty(name, type, propertyOptions = {}, methodOptions = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(type, 'type', ow.string.oneOf(['attribute', 'method']));
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(
        methodOptions,
        'methodOptions',
        ow.object.exactShape({returnDescriptor: ow.optional.boolean})
      );

      const {returnDescriptor = false} = methodOptions;

      let property = this.getProperty(name, {throwIfMissing: false});

      if (property === undefined) {
        const Property = type === 'attribute' ? Attribute : Method;
        property = new Property(name, this, propertyOptions);
        const properties = this.__getProperties();
        properties[name] = property;
      } else {
        if (property.getType() !== type) {
          throw new Error(`Cannot change the type of the '${name}' property`);
        }
        property.setOptions(propertyOptions);
      }

      if (type === 'attribute') {
        const descriptor = {
          configurable: true,
          enumerable: true,
          get() {
            return this.getAttribute(name).getValue();
          },
          set(value) {
            return this.getAttribute(name).setValue(value);
          }
        };

        if (returnDescriptor) {
          return descriptor;
        }

        Object.defineProperty(this, name, descriptor);
      }

      return property;
    },

    deleteProperty(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const properties = this.__getProperties();

      if (!hasOwnProperty(properties, name)) {
        if (throwIfMissing) {
          throw new Error(`Cannot delete the property '${name}' which is missing`);
        }
        return false;
      }

      delete properties[name];

      return true;
    },

    hasProperty(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getProperty(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

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
    },

    // === Attributes ===

    getAttribute(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      const property = this.getProperty(name, {throwIfMissing, autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isAttribute(property)) {
        throw new Error(`The property '${name}' exists, but it is not an attribute`);
      }

      return property;
    },

    setAttribute(name, propertyOptions = {}, methodOptions = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(methodOptions, 'methodOptions', ow.object);

      return this.setProperty(name, 'attribute', propertyOptions, methodOptions);
    },

    hasAttribute(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getAttribute(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getAttributes(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(property) {
        if (!isAttribute(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, autoFork});
    },

    getActiveAttributes(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(attribute) {
        if (!attribute.isActive()) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, attribute);
        }

        return true;
      };

      return this.getAttributes({filter, autoFork});
    },

    // === Methods ===

    getMethod(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      const property = this.getProperty(name, {throwIfMissing, autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isMethod(property)) {
        throw new Error(`The property '${name}' exists, but it is not a method`);
      }

      return property;
    },

    setMethod(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object);

      return this.setProperty(name, 'method', options);
    },

    hasMethod(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getMethod(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getMethods(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(property) {
        if (!isMethod(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, autoFork});
    },

    // === Introspection ===

    introspectProperties(options = {}) {
      ow(options, 'options', ow.object.exactShape({filter: ow.optional.function}));

      const {filter} = options;

      const introspectedProperties = [];

      for (const property of this.getProperties({filter})) {
        const name = property.getName();
        const serializedExposure = property.serializeExposure();
        introspectedProperties.push({name, exposure: serializedExposure});
      }

      return introspectedProperties;
    }
  };

  Object.assign(CommonWithProperties, commonMethods);
  Object.assign(CommonWithProperties.prototype, commonMethods);

  class WithProperties extends CommonWithProperties {
    constructor(object = {}) {
      super();

      for (const attribute of this.getAttributes()) {
        const name = attribute.getName();
        const value = hasOwnProperty(object, name) ? object[name] : attribute.getDefaultValue();
        attribute.setValue(value);
      }
    }

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
      throw new Error(
        `@property() target doesn't inherit from WithProperties (property name: '${name}')`
      );
    }

    if (typeof descriptor.value === 'function' && descriptor.enumerable === false) {
      return method(options)(target, name, descriptor);
    }

    return attribute(options)(target, name, descriptor);
  };
}

export function attribute(options = {}) {
  ow(options, 'options', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isWithProperties(target) || isWithProperties(target.prototype))) {
      throw new Error(
        `@attribute() target doesn't inherit from WithProperties (property name: '${name}')`
      );
    }

    if (
      !(
        (typeof descriptor.initializer === 'function' || descriptor.initializer === null) &&
        descriptor.enumerable === true
      )
    ) {
      throw new Error(
        `@attribute() cannot be used without an attribute declaration (property name: '${name}')`
      );
    }

    // Normalize initializer that can be null in certain cases
    const initializer =
      typeof descriptor.initializer === 'function' ? descriptor.initializer : undefined;

    if (isWithProperties(target.prototype)) {
      // The target is a component class
      const property = target.getProperty(name, {throwIfMissing: false, autoFork: false});
      if (property?.getParent() === target) {
        // If the attribute already exists in the target, it means it was forked from
        // the parent class as a side effect of the attribute declaration
        // In this case, the new value should have already been set and there is nothing to do
      } else {
        // It is a new attribute or the attribute declaration didn't fork a parent attribute
        const initialValue = initializer?.call(target);
        options = {value: initialValue, ...options};
      }
    } else {
      // The target is a component prototype
      const defaultValue = initializer;
      options = {default: defaultValue, ...options};
    }

    descriptor = target.setAttribute(name, options, {returnDescriptor: true});

    return {...descriptor, __decoratedBy: '@attribute()'};
  };
}

export function method(options = {}) {
  ow(options, 'options', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isWithProperties(target) || isWithProperties(target.prototype))) {
      throw new Error(
        `@method() target doesn't inherit from WithProperties (property name: '${name}')`
      );
    }

    if (!(typeof descriptor.value === 'function' && descriptor.enumerable === false)) {
      throw new Error(
        `@method() cannot be used without a method declaration (property name: '${name}')`
      );
    }

    target.setMethod(name, options);

    return {...descriptor, __decoratedBy: '@method()'};
  };
}

export function inherit() {
  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isWithProperties(target) || isWithProperties(target.prototype))) {
      throw new Error(
        `@inherit() target doesn't inherit from WithProperties (property name: '${name}')`
      );
    }

    const property = target.getProperty(name, {throwIfMissing: false, autoFork: false});

    if (property === undefined) {
      throw new Error(
        `@inherit() cannot be used with the property '${name}' which is missing in the parent class`
      );
    }

    if (
      isWithProperties(target.prototype) &&
      isAttribute(property) &&
      property.getParent() === target
    ) {
      // If the target is a component class and the inherited property is an attribute,
      // we must roll back the attribute declaration that has reinitialized the value
      target.deleteProperty(name);
    }

    descriptor = getInheritedPropertyDescriptor(target, name);

    return {...descriptor, __decoratedBy: '@inherit()'};
  };
}

export function expose(exposure = {}) {
  ow(exposure, 'exposure', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isWithProperties(target) || isWithProperties(target.prototype))) {
      throw new Error(
        `@expose() target doesn't inherit from WithProperties (property name: '${name}')`
      );
    }

    const {__decoratedBy: decoratedBy} = descriptor;

    if (
      decoratedBy === '@attribute()' ||
      decoratedBy === '@method()' ||
      decoratedBy === '@inherit()'
    ) {
      // @expose() is used after @property(), @attribute(), @method(), or @inherit()
      const property = target.getProperty(name);
      property.setExposure(exposure);
      return descriptor;
    }

    descriptor = property({exposure})(target, name, descriptor);

    return descriptor;
  };
}
