import ow from 'ow';
import {syncOrAsync} from '@deepr/util';

import {MissingPropertyEmitter} from './missing-property-emitter';

const EMPTY_MAP = new Map();

export const Registerable = (Base = MissingPropertyEmitter) =>
  class Registerable extends Base {
    // === Class ===

    static $getRegisteredName() {
      return _getRegisteredName(this);
    }

    static $setRegisteredName(registeredName) {
      _setRegisteredName(this, registeredName);
    }

    static $isRegistered() {
      return _isRegistered(this);
    }

    static $getLayer({throwIfNotFound = true} = {}) {
      return _getLayer(this, {throwIfNotFound});
    }

    static get $layer() {
      return this.$getLayer();
    }

    static $setLayer(layer) {
      _setLayer(this, layer);
    }

    static $hasLayer() {
      const layer = this.$getLayer({throwIfNotFound: false});
      return layer !== undefined;
    }

    static $getParentLayer({throwIfNotFound = true} = {}) {
      const layer = this.$getLayer({throwIfNotFound});
      return layer?.getParent({throwIfNotFound});
    }

    static $hasParentLayer() {
      const layer = this.$getLayer({throwIfNotFound: false});
      return layer ? layer.hasParent() : false;
    }

    static $callParentLayer(methodName, ...args) {
      const layer = this.$getLayer();
      return _callParentLayer(layer, this, methodName, ...args);
    }

    static $exposeProperty(name, type, options) {
      _exposeProperty(this, name, type, options);
    }

    static $getExposedProperty(name) {
      return _getExposedProperty(this, name);
    }

    static $getExposedProperties() {
      return _getExposedProperties(this);
    }

    static async $exposedPropertyOperationIsAllowed({property, operation, setting}) {
      return await _exposedPropertyOperationIsAllowed(this, {property, operation, setting});
    }

    static $onMissingProperty(name) {
      return _onMissingProperty(this, name);
    }

    static $fork() {
      return _fork(this);
    }

    static $introspect() {
      return _introspect(this);
    }

    // === Instance ===

    $getRegisteredName() {
      return _getRegisteredName(this);
    }

    $setRegisteredName(registeredName) {
      _setRegisteredName(this, registeredName);
    }

    $isRegistered() {
      return _isRegistered(this);
    }

    $getLayer({fallBackToClass = true, throwIfNotFound = true} = {}) {
      // First, let try to get the instance's layer
      const layer = _getLayer(this, {throwIfNotFound: throwIfNotFound && !fallBackToClass});
      if (layer) {
        return layer;
      }
      if (fallBackToClass) {
        // If not found, let's fall back to the class' layer
        return _getLayer(this.constructor, {throwIfNotFound});
      }
    }

    get $layer() {
      return this.$getLayer();
    }

    $setLayer(layer) {
      _setLayer(this, layer);
    }

    $hasLayer({fallBackToClass = true} = {}) {
      const layer = this.$getLayer({fallBackToClass, throwIfNotFound: false});
      return layer !== undefined;
    }

    $getParentLayer({fallBackToClass = true, throwIfNotFound = true} = {}) {
      const layer = this.$getLayer({fallBackToClass, throwIfNotFound});
      return layer?.getParent({throwIfNotFound});
    }

    $hasParentLayer({fallBackToClass = true} = {}) {
      const layer = this.$getLayer({fallBackToClass, throwIfNotFound: false});
      return layer ? layer.hasParent() : false;
    }

    $callParentLayer(methodName, ...args) {
      const layer = this.$getLayer();
      return _callParentLayer(layer, this, methodName, ...args);
    }

    $exposeProperty(name, type, options) {
      _exposeProperty(this, name, type, options);
    }

    $getExposedProperty(name) {
      return _getExposedProperty(this, name);
    }

    $getExposedProperties() {
      return _getExposedProperties(this);
    }

    async $exposedPropertyOperationIsAllowed({property, operation, setting}) {
      return await _exposedPropertyOperationIsAllowed(this, {property, operation, setting});
    }

    $onMissingProperty(name) {
      return _onMissingProperty(this, name);
    }

    $fork() {
      return _fork(this);
    }

    $introspect() {
      return _introspect(this);
    }
  };

// === Common logic used by both class and instance methods ===

function _getRegisteredName(target) {
  return target._registeredName;
}

function _setRegisteredName(target, registeredName) {
  Object.defineProperty(target, '_registeredName', {value: registeredName});
}

function _isRegistered(target) {
  return target._registeredName !== undefined;
}

function _getLayer(target, {throwIfNotFound = true} = {}) {
  const layer = Object.prototype.hasOwnProperty.call(target, '_layer') ? target._layer : undefined;
  if (layer) {
    return layer;
  }
  if (throwIfNotFound) {
    throw new Error(`Layer not found`);
  }
}

function _setLayer(target, layer) {
  Object.defineProperty(target, '_layer', {value: layer});
}

function _callParentLayer(layer, target, methodName, ...args) {
  const query = _buildQuery(target, methodName, ...args);
  return syncOrAsync(layer.sendQuery(query), ({result}) => result);
}

function _buildQuery(target, methodName, ...args) {
  if (typeof target === 'function') {
    // The target is a class
    return {
      [`${target.$getRegisteredName()}=>`]: {
        [`${methodName}=>result`]: {
          '([])': args
        }
      }
    };
  }

  if (target.$isRegistered()) {
    // The target is a registered instance
    return {
      [`${target.$getRegisteredName()}=>`]: {
        [`${methodName}=>result`]: {
          '([])': args
        }
      }
    };
  }

  // The target is a unregistered instance
  return {
    '<=': target,
    [`${methodName}=>result`]: {
      '([])': args
    },
    '=>changes': true
  };
}

function _exposeProperty(target, name, type, options) {
  ow(type, ow.string.oneOf(['field', 'method']));
  const setting = ow.optional.any(ow.boolean, ow.string.nonEmpty, ow.array, ow.set);
  if (type === 'field') {
    ow(options, ow.object.exactShape({read: setting, write: setting}));
  } else if (type === 'method') {
    ow(options, ow.object.exactShape({call: setting}));
  }

  if (!target._exposedProperties) {
    target._exposedProperties = new Map();
  } else if (!Object.prototype.hasOwnProperty.call(target, '_exposedProperties')) {
    target._exposedProperties = new Map(target._exposedProperties);
  }

  target._exposedProperties.set(name, {name, type, ...options});
}

function _getExposedProperty(target, name) {
  return target._exposedProperties?.get(name);
}

function _getExposedProperties(target) {
  return target._exposedProperties || EMPTY_MAP;
}

async function _exposedPropertyOperationIsAllowed(
  _target,
  {property: _property, operation: _operation, setting}
) {
  if (setting === true) {
    return true;
  }

  if (setting === false) {
    return false;
  }

  return undefined;
}

function _onMissingProperty(target, name) {
  if (typeof name === 'symbol' || name.startsWith('_')) {
    // Symbols and property names prefixed with an underscore shouldn't be exposed
    return undefined;
  }

  const parentTarget = _getParentTarget(target);
  if (!parentTarget) {
    return undefined;
  }

  const exposedProperty = parentTarget.$getExposedProperty(name);
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

function _getParentTarget(target) {
  if (typeof target === 'function') {
    // The target is a class
    const registeredName = target.$getRegisteredName();
    if (!registeredName) {
      return undefined;
    }
    const parentLayer = target.$getParentLayer({throwIfNotFound: false});
    const parentTarget = parentLayer?.get(registeredName, {throwIfNotFound: false});
    if (!isExposed(parentTarget)) {
      return undefined;
    }
    return parentTarget;
  }

  // The target is an instance
  let registeredName = target.$getRegisteredName();
  if (registeredName) {
    // The target is a registered instance
    const parentLayer = target.$getParentLayer({fallBackToClass: false, throwIfNotFound: false});
    const parentTarget = parentLayer?.get(registeredName, {throwIfNotFound: false});
    if (!isExposed(parentTarget)) {
      return undefined;
    }
    return parentTarget;
  }

  // The target is an instance of a registered class
  registeredName = target.constructor.$getRegisteredName();
  if (!registeredName) {
    return undefined;
  }
  const parentLayer = target.constructor.$getParentLayer({throwIfNotFound: false});
  const parentTarget = parentLayer?.get(registeredName, {throwIfNotFound: false});
  if (!isExposed(parentTarget)) {
    return undefined;
  }
  return parentTarget.prototype;
}

function _fork(target) {
  if (typeof target === 'function') {
    // Class forking
    return class extends target {};
  }

  // Instance forking
  return Object.create(target);
}

/*
{
  _type: 'class',
  _isExposed: true,
  get: {
    _type: 'method'
  },
  prototype: {
    save: {
      _type: 'method'
    }
  }
}
*/

function _introspect(target) {
  const isClass = typeof target === 'function';

  const introspection = {
    _type: isClass ? 'class' : 'object'
  };

  for (const {name, type} of _getExposedProperties(target).values()) {
    introspection[name] = {_type: type};
  }

  if (isClass) {
    introspection.prototype = {};
    for (const {name, type} of _getExposedProperties(target.prototype).values()) {
      introspection.prototype[name] = {_type: type};
    }
  }

  return introspection;
}

// === Exposition ===

export function expose(options = {}) {
  return function (target, name, descriptor) {
    if (!name) {
      // @expose() used on a class or an object
      // TODO: Get rid of this
      target._isExposed = true;
      return target;
    }

    if (descriptor.initializer !== undefined) {
      // @expose() used on an inherited property shortcut
      // Examples: `@expose() title;` or `@expose() save;`
      const prototype = Object.getPrototypeOf(target);
      descriptor = getPropertyDescriptor(prototype, name);
    }

    const type = typeof descriptor.value === 'function' ? 'method' : 'field';

    target.$exposeProperty(name, type, options);

    return descriptor;
  };
}

export function isExposed(target, name) {
  if (target === undefined) {
    return false;
  }
  if (!name) {
    // @isExposed() called with a class or an instance
    return target._isExposed === true;
  }
  return target.$getExposedProperty(name) !== undefined;
}

// === Utilities ===

export function isRegisterable(value) {
  return typeof value?.$getLayer === 'function';
}

function getPropertyDescriptor(object, name) {
  if (!((typeof object === 'object' && object !== null) || typeof object === 'function')) {
    return undefined;
  }

  if (!(name in object)) {
    return undefined;
  }

  while (object !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    if (descriptor) {
      return descriptor;
    }
    object = Object.getPrototypeOf(object);
  }
}
