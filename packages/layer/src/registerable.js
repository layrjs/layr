import {hasOwnProperty, getInheritedPropertyDescriptor} from '@liaison/util';
import {syncOrAsync} from '@deepr/util';
import ow from 'ow';

import {isSerializable} from './serializable';
import {MissingPropertyEmitter} from './missing-property-emitter';

const EMPTY_MAP = new Map();

export const Registerable = (Base = MissingPropertyEmitter) =>
  class Registerable extends Base {
    // === Static methods ===

    static $getRegisteredName() {
      return this.__registeredName;
    }

    static $setRegisteredName(registeredName) {
      Object.defineProperty(this, '__registeredName', {value: registeredName});
    }

    static $isRegistered() {
      return this.__registeredName !== undefined;
    }

    static $getLayer({throwIfNotFound = true} = {}) {
      const layer = hasOwnProperty(this, '__layer') ? this.__layer : undefined;
      if (layer) {
        return layer;
      }
      if (throwIfNotFound) {
        throw new Error(`Layer not found`);
      }
    }

    static get $layer() {
      return this.$getLayer();
    }

    static $setLayer(layer) {
      Object.defineProperty(this, '__layer', {value: layer});
    }

    static $hasLayer() {
      return this.$getLayer({throwIfNotFound: false}) !== undefined;
    }

    static $getParentLayer({throwIfNotFound = true} = {}) {
      const layer = this.$getLayer({throwIfNotFound});
      return layer?.getParent({throwIfNotFound});
    }

    static $hasParentLayer() {
      const layer = this.$getLayer({throwIfNotFound: false});
      return layer ? layer.hasParent() : false;
    }

    static async $open() {
      // Override this method to implement initialization logic
    }

    static async $close() {
      // Override this method to implement deinitialization logic
    }

    static $exposeProperty(name, type, options) {
      ow(type, ow.string.oneOf(['field', 'method']));
      const setting = ow.optional.any(ow.boolean, ow.string.nonEmpty, ow.array, ow.set);
      if (type === 'field') {
        ow(options, ow.object.exactShape({read: setting, write: setting}));
      } else if (type === 'method') {
        ow(options, ow.object.exactShape({call: setting}));
      }

      if (!this.__exposedProperties) {
        this.__exposedProperties = new Map();
      } else if (!hasOwnProperty(this, '__exposedProperties')) {
        this.__exposedProperties = new Map(this.__exposedProperties);
      }

      this.__exposedProperties.set(name, {name, type, ...options});
    }

    static $getExposedProperty(name) {
      return this.__exposedProperties?.get(name);
    }

    static $getExposedProperties() {
      return this.__exposedProperties || EMPTY_MAP;
    }

    static $hasExposedProperties() {
      return this.__exposedProperties !== undefined;
    }

    // eslint-disable-next-line no-unused-vars
    static async $exposedPropertyOperationIsAllowed({property, operation, setting}) {
      if (setting === true) {
        return true;
      }

      if (setting === false) {
        return false;
      }

      return undefined;
    }

    static $fork() {
      const forkedLayer = this.$getLayer().fork();
      return this.$forkInto(forkedLayer);
    }

    static $forkInto(targetLayer) {
      const registeredName = this.$getRegisteredName();
      if (registeredName) {
        return targetLayer.get(registeredName);
      }

      throw new Error('Cannot fork a registerable that is not registered');
    }

    static __fork() {
      const Base = this;
      return class extends Base {
        static [Symbol.hasInstance](instance) {
          // Since we are forking instances with Object.create(),
          // let's make them believe they are instance of the forked class
          return instance instanceof Base;
        }
      };
    }

    static $detach() {
      this.__isDetached = true;
      return this;
    }

    static $isDetached() {
      return this.__isDetached === true;
    }

    static $callParentLayer(methodName, ...args) {
      const layer = this.$getLayer();
      const query = this.__buildQuery(methodName, ...args);
      return syncOrAsync(layer.sendQuery(query), ({result}) => result);
    }

    static __buildQuery(methodName, ...args) {
      return {
        [`${this.$getRegisteredName()}=>`]: {
          [`${methodName}=>result`]: {
            '([])': args
          }
        }
      };
    }

    static $onMissingProperty(name) {
      if (typeof name === 'symbol' || name.startsWith('_')) {
        // Symbols and property names prefixed with an underscore shouldn't be exposed
        return undefined;
      }

      const parentRegistrable = this.__getParentRegistrable();
      if (!parentRegistrable) {
        return undefined;
      }

      const exposedProperty = parentRegistrable.$getExposedProperty(name);
      if (!exposedProperty) {
        return undefined;
      }

      if (exposedProperty.type !== 'method') {
        throw new Error('Currently, only exposed methods are supported');
      }

      return function (...args) {
        return this.$callParentLayer(name, ...args);
      };
    }

    static __getParentRegistrable() {
      const registeredName = this.$getRegisteredName();

      if (!registeredName) {
        return undefined;
      }

      const parentLayer = this.$getParentLayer({throwIfNotFound: false});
      const parentRegistrable = parentLayer?.get(registeredName, {throwIfNotFound: false});

      if (!isExposed(parentRegistrable)) {
        return undefined;
      }

      return parentRegistrable;
    }

    static $introspect() {
      const introspection = {
        _type: 'class'
      };

      for (const {name, type} of this.$getExposedProperties().values()) {
        introspection[name] = {_type: type};
      }

      introspection.prototype = this.prototype.$introspect();

      return introspection;
    }

    // === Instance methods ===

    $getRegisteredName() {
      return this.constructor.$getRegisteredName.call(this);
    }

    $setRegisteredName(registeredName) {
      this.constructor.$setRegisteredName.call(this, registeredName);
    }

    $isRegistered() {
      return this.constructor.$isRegistered.call(this);
    }

    $getLayer({fallBackToClass = true, throwIfNotFound = true} = {}) {
      // First, let try to get the instance's layer
      const layer = this.constructor.$getLayer.call(this, {
        throwIfNotFound: throwIfNotFound && !fallBackToClass
      });
      if (layer) {
        return layer;
      }
      if (fallBackToClass) {
        // If not found, let's fall back to the class' layer
        return this.constructor.$getLayer({throwIfNotFound});
      }
    }

    get $layer() {
      return this.$getLayer();
    }

    $setLayer(layer) {
      this.constructor.$setLayer.call(this, layer);
    }

    $hasLayer({fallBackToClass = true} = {}) {
      return this.$getLayer({fallBackToClass, throwIfNotFound: false}) !== undefined;
    }

    $getParentLayer({fallBackToClass = true, throwIfNotFound = true} = {}) {
      const layer = this.$getLayer({fallBackToClass, throwIfNotFound});
      return layer?.getParent({throwIfNotFound});
    }

    $hasParentLayer({fallBackToClass = true} = {}) {
      const layer = this.$getLayer({fallBackToClass, throwIfNotFound: false});
      return layer ? layer.hasParent() : false;
    }

    async $open() {
      // Override this method to implement initialization logic
    }

    async $close() {
      // Override this method to implement deinitialization logic
    }

    $exposeProperty(name, type, options) {
      this.constructor.$exposeProperty.call(this, name, type, options);
    }

    $getExposedProperty(name) {
      return this.constructor.$getExposedProperty.call(this, name);
    }

    $getExposedProperties() {
      return this.constructor.$getExposedProperties.call(this);
    }

    $hasExposedProperties() {
      return this.constructor.$hasExposedProperties.call(this);
    }

    async $exposedPropertyOperationIsAllowed({property, operation, setting}) {
      return await this.constructor.$exposedPropertyOperationIsAllowed.call(this, {
        property,
        operation,
        setting
      });
    }

    $fork() {
      const forkedLayer = this.$getLayer().fork();
      return this.$forkInto(forkedLayer);
    }

    $forkInto(targetLayer) {
      const registeredName = this.$getRegisteredName();
      if (registeredName) {
        return targetLayer.get(registeredName);
      }

      const constructorRegisteredName = this.constructor.$getRegisteredName();
      if (constructorRegisteredName) {
        const forkedConstructor = targetLayer.get(constructorRegisteredName);
        let fork = forkedConstructor.$getInstance(this);
        if (!fork) {
          fork = this.__fork(forkedConstructor);
        }
        return fork;
      }

      throw new Error('Cannot fork a registerable that is not registered');
    }

    __fork(forkedConstructor) {
      // Changing the constructor sounds a bit hacky
      // TODO: Consider doing deserialize(serialize()) instead

      const fork = Object.create(this);

      if (forkedConstructor) {
        fork.constructor = forkedConstructor;
      }

      return fork;
    }

    $merge(fork) {
      if (!isSerializable(fork)) {
        throw new Error(`Cannot merge an object that is not serializable`);
      }
      this.$deserialize(fork.$serialize());
    }

    $detach() {
      return this.constructor.$detach.call(this);
    }

    $isDetached() {
      return this.constructor.$isDetached() || this.constructor.$isDetached.call(this);
    }

    $callParentLayer(methodName, ...args) {
      return this.constructor.$callParentLayer.call(this, methodName, ...args);
    }

    __buildQuery(methodName, ...args) {
      if (this.$isRegistered()) {
        return {
          [`${this.$getRegisteredName()}=>`]: {
            [`${methodName}=>result`]: {
              '([])': args
            }
          }
        };
      }

      return {
        '<=': this,
        [`${methodName}=>result`]: {
          '([])': args
        },
        '=>changes': true
      };
    }

    $onMissingProperty(name) {
      return this.constructor.$onMissingProperty.call(this, name);
    }

    __getParentRegistrable() {
      let registeredName = this.$getRegisteredName();

      if (registeredName) {
        // The instance is registered
        const parentLayer = this.$getParentLayer({fallBackToClass: false, throwIfNotFound: false});
        const parentRegistrable = parentLayer?.get(registeredName, {throwIfNotFound: false});
        if (!isExposed(parentRegistrable)) {
          return undefined;
        }
        return parentRegistrable;
      }

      // Let's see if the class is registered
      registeredName = this.constructor.$getRegisteredName();

      if (!registeredName) {
        return undefined;
      }

      const parentLayer = this.constructor.$getParentLayer({throwIfNotFound: false});
      const parentRegistrable = parentLayer?.get(registeredName, {throwIfNotFound: false});

      if (!isExposed(parentRegistrable)) {
        return undefined;
      }

      return parentRegistrable.prototype;
    }

    $introspect() {
      const introspection = {
        _type: 'instance'
      };

      for (const {name, type} of this.$getExposedProperties().values()) {
        introspection[name] = {_type: type};
      }

      return introspection;
    }
  };

// === Exposition ===

export function expose(options = {}) {
  return function (target, name, descriptor) {
    if (!isRegisterable(target)) {
      throw new Error(`@expose() target must be a registerable`);
    }
    if (!(name && descriptor)) {
      throw new Error(`@expose() must be used to decorate properties`);
    }

    if (descriptor.initializer !== undefined) {
      // @expose() is used on an property defined in a parent class
      // Examples: `@expose() title;` or `@expose() static $get;`
      descriptor = getInheritedPropertyDescriptor(target, name);
      if (descriptor === undefined) {
        throw new Error(`Cannot expose an undefined property (name: '${name}')`);
      }
    }

    const type = typeof descriptor.value === 'function' ? 'method' : 'field';

    target.$exposeProperty(name, type, options);

    return descriptor;
  };
}

export function isExposed(target, name) {
  if (!isRegisterable(target)) {
    return false;
  }

  if (!name) {
    // isExposed() called with a class or an instance
    return target.__isRegisterableProxy || target.$hasExposedProperties();
  }

  return target.$getExposedProperty(name) !== undefined;
}

// === Utilities ===

export function isRegisterable(value) {
  return value?.__isRegisterableProxy || typeof value?.$getLayer === 'function';
}
