import {hasOwnProperty, getInheritedPropertyDescriptor} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import isEmpty from 'lodash/isEmpty';

import {Property} from './property';
import {isSerializable} from './serializable';
import {MissingPropertyEmitter} from './missing-property-emitter';

export const Registerable = (Base = MissingPropertyEmitter) =>
  class Registerable extends Base {
    // *** Static methods ***

    // === Registration ===

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

    // === Opening and closing ===

    static $open() {
      // Override this method to implement initialization logic
    }

    static $close() {
      // Override this method to implement deinitialization logic
    }

    // === Properties ===

    static $getProperty(name, {throwIfNotFound = true} = {}) {
      const properties = this.__getProperties();

      let property = properties[name];

      if (!property) {
        if (throwIfNotFound) {
          throw new Error(`Property not found (name: '${name}')`);
        }
        return undefined;
      }

      if (!hasOwnProperty(properties, name)) {
        property = property.fork(this);
        properties[name] = property;
      }

      return property;
    }

    static $setProperty(name, options = {}) {
      return this.__setProperty(Property, name, options);
    }

    static __setProperty(constructor, name, options = {}) {
      if (this.$hasProperty(name)) {
        const existingProperty = this.$getProperty(name);
        options = {...existingProperty.getOptions(), ...options};
      }

      const properties = this.__getProperties();
      const property = new constructor(this, name, options);
      properties[name] = property;

      return property;
    }

    static $hasProperty(name) {
      return this.$getProperty(name, {throwIfNotFound: false}) !== undefined;
    }

    static $getProperties({filter} = {}) {
      const model = this;

      return {
        * [Symbol.iterator]() {
          for (const name of model.$getPropertyNames()) {
            const property = model.$getProperty(name);

            if (filter && !filter.call(this, property)) {
              continue;
            }

            yield property;
          }
        }
      };
    }

    static $getPropertyNames() {
      const properties = this.__properties;

      return {
        * [Symbol.iterator]() {
          if (properties) {
            // eslint-disable-next-line guard-for-in
            for (const name in properties) {
              yield name;
            }
          }
        }
      };
    }

    static __getProperties() {
      if (!this.__properties) {
        this.__properties = Object.create(null);
      } else if (!hasOwnProperty(this, '__properties')) {
        this.__properties = Object.create(this.__properties);
      }

      return this.__properties;
    }

    // === Property exposition ===

    static $getExposedProperties() {
      return this.$getProperties({filter: property => property.isExposed()});
    }

    static $isExposed() {
      const iterator = this.$getExposedProperties()[Symbol.iterator]();
      return !iterator.next().done;
    }

    static $getPropertyExposition(name, {throwIfNotFound = true} = {}) {
      const property = this.$getProperty(name, {throwIfNotFound});
      return property?.getExposition();
    }

    static $resolvePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    }

    static $normalizePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    }

    static $serializePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    }

    // === Forking ===

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

    static $getGhost() {
      const ghostLayer = this.$getLayer().getGhost();
      return this.$forkInto(ghostLayer);
    }

    static get $ghost() {
      return this.$getGhost();
    }

    // === Attachment ===

    static $detach() {
      this.__isDetached = true;
      return this;
    }

    static $isDetached() {
      return this.__isDetached === true;
    }

    // === Queries ===

    static $onMissingProperty(name) {
      if (typeof name === 'symbol' || name.startsWith('_')) {
        // Symbols and property names prefixed with an underscore shouldn't be exposed
        return undefined;
      }

      const parentRegistrable = this.__getParentRegistrable();
      if (!parentRegistrable) {
        return undefined;
      }

      const exposition = parentRegistrable.$getPropertyExposition(name, {throwIfNotFound: false});

      if (exposition === undefined) {
        return undefined;
      }

      if (exposition.call === undefined) {
        throw new Error('Currently, only callable exposed properties are supported');
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

      if (!parentRegistrable?.$isExposed()) {
        return undefined;
      }

      return parentRegistrable;
    }

    static $callParentLayer(methodName, ...args) {
      const layer = this.$getLayer();
      const query = this.__buildQuery(methodName, ...args);
      return possiblyAsync(layer.sendQuery(query), {then: ({result}) => result});
    }

    static __buildQuery(methodName, ...args) {
      return {
        [`${this.$getRegisteredName()}=>`]: {
          [`${methodName}=>result`]: {
            '()': args
          }
        }
      };
    }

    // === Utilities ===

    static $introspect({propertyFilter} = {}) {
      const introspection = this.prototype.$introspect.call(this);

      const prototypeIntrospection = this.prototype.$introspect({propertyFilter});

      if (!isEmpty(prototypeIntrospection)) {
        introspection.prototype = prototypeIntrospection;
      }

      return introspection;
    }

    // *** Instance methods ***

    // === Registration ===

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

    // === Opening and closing ===

    $open() {
      // Override this method to implement initialization logic
    }

    $close() {
      // Override this method to implement deinitialization logic
    }

    // === Properties ===

    $getProperty(name, {throwIfNotFound = true} = {}) {
      return this.constructor.$getProperty.call(this, name, {throwIfNotFound});
    }

    $setProperty(name, options = {}) {
      return this.constructor.$setProperty.call(this, name, options);
    }

    __setProperty(constructor, name, options = {}) {
      return this.constructor.__setProperty.call(this, constructor, name, options);
    }

    $hasProperty(name) {
      return this.constructor.$hasProperty.call(this, name);
    }

    $getProperties({filter} = {}) {
      return this.constructor.$getProperties.call(this, {filter});
    }

    $getPropertyNames() {
      return this.constructor.$getPropertyNames.call(this);
    }

    __getProperties() {
      return this.constructor.__getProperties.call(this);
    }

    // === Property exposition ===

    $getExposedProperties() {
      return this.constructor.$getExposedProperties.call(this);
    }

    $isExposed() {
      return this.constructor.$isExposed.call(this);
    }

    $getPropertyExposition(name, {throwIfNotFound = true} = {}) {
      return this.constructor.$getPropertyExposition.call(this, name, {throwIfNotFound});
    }

    $resolvePropertyOperationSetting(setting) {
      return this.constructor.$resolvePropertyOperationSetting.call(this, setting);
    }

    $normalizePropertyOperationSetting(setting) {
      return this.constructor.$normalizePropertyOperationSetting(setting);
    }

    $serializePropertyOperationSetting(setting) {
      return this.constructor.$serializePropertyOperationSetting.call(this, setting);
    }

    // === Forking ===

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
        // OPTIMIZE: Serialize unique fields only
        let fork = forkedConstructor.$getInstance(this.$serialize());
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

    $merge(fork, {includeReferencedEntities} = {}) {
      // OPTIMIZE: Instead of serializing and deserializing everything,
      // try to copy the new values only

      if (!isSerializable(fork)) {
        throw new Error(`Cannot merge an object that is not serializable`);
      }

      this.$deserialize(fork.$serialize({includeReferencedEntities}), {includeReferencedEntities});
    }

    $getGhost() {
      return this.constructor.$getGhost.call(this);
    }

    get $ghost() {
      return this.$getGhost();
    }

    // === Attachment ===

    $detach() {
      return this.constructor.$detach.call(this);
    }

    $isDetached() {
      return this.constructor.$isDetached() || this.constructor.$isDetached.call(this);
    }

    // === Queries ===

    $onMissingProperty(name) {
      return this.constructor.$onMissingProperty.call(this, name);
    }

    __getParentRegistrable() {
      const registeredName = this.$getRegisteredName();

      if (registeredName) {
        // The instance is registered
        const parentLayer = this.$getParentLayer({fallBackToClass: false, throwIfNotFound: false});
        const parentRegistrable = parentLayer?.get(registeredName, {throwIfNotFound: false});
        if (!parentRegistrable?.$isExposed()) {
          return undefined;
        }
        return parentRegistrable;
      }

      // Let's see if the class is registered
      const classRegisteredName = this.constructor.$getRegisteredName();

      if (!classRegisteredName) {
        return undefined;
      }

      const classParentLayer = this.constructor.$getParentLayer({throwIfNotFound: false});
      const ParentRegistrable = classParentLayer?.get(classRegisteredName, {
        throwIfNotFound: false
      });

      if (!ParentRegistrable) {
        return undefined;
      }

      const parentRegistrable = ParentRegistrable.prototype;

      if (!parentRegistrable.$isExposed()) {
        return undefined;
      }

      return parentRegistrable;
    }

    $callParentLayer(methodName, ...args) {
      return this.constructor.$callParentLayer.call(this, methodName, ...args);
    }

    __buildQuery(methodName, ...args) {
      if (this.$isRegistered()) {
        return {
          [`${this.$getRegisteredName()}=>`]: {
            [`${methodName}=>result`]: {
              '()': args
            }
          }
        };
      }

      return {
        '<=': this,
        [`${methodName}=>result`]: {
          '()': args
        },
        '=>changes': true
      };
    }

    // === Utilities ===

    $introspect({propertyFilter} = {}) {
      const introspection = {};

      const properties = {};

      for (const property of this.$getProperties({filter: propertyFilter})) {
        const name = property.getName();

        properties[name] = {};

        const serializedExposition = property.serializeExposition();
        if (serializedExposition !== undefined) {
          properties[name].exposition = serializedExposition;
        }
      }

      if (!isEmpty(properties)) {
        introspection.properties = properties;
      }

      return introspection;
    }
  };

// === Utilities ===

export function isRegisterable(value) {
  return value?.__isRegisterableMock || typeof value?.$getLayer === 'function';
}

// === Decorators ===

export function property(options = {}) {
  return function (target, name, descriptor) {
    if (!(isRegisterable(target) || isRegisterable(target.prototype))) {
      throw new Error(`@property() target must be a model`);
    }

    if (!(name && descriptor)) {
      throw new Error(`@property() must be used to decorate properties`);
    }

    if (descriptor.initializer !== undefined) {
      // @property() is used on an property defined in a parent class
      // Examples: `@property() title;` or `@property() static find;`
      descriptor = getInheritedPropertyDescriptor(target, name);
      if (descriptor === undefined) {
        throw new Error(`Cannot use @property() on an undefined property (name: '${name}')`);
      }
    }

    target.$setProperty(name, options);

    return descriptor;
  };
}
