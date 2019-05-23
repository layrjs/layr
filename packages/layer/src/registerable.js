import {syncOrAsync} from '@deepr/util';

export const Registerable = (Base = Object) =>
  class Registerable extends Base {
    // === Class ===

    static getRegisteredName() {
      return _getRegisteredName(this);
    }

    static setRegisteredName(registeredName) {
      _setRegisteredName(this, registeredName);
    }

    static getLayer({throwIfNotFound = true} = {}) {
      return _getLayer(this, {throwIfNotFound});
    }

    static setLayer(layer) {
      _setLayer(this, layer);
    }

    static callParentLayer(methodName, ...args) {
      return _callParentLayer(this, methodName, ...args);
    }

    static fork() {
      return _fork(this);
    }

    // === Instance ===

    getRegisteredName() {
      return _getRegisteredName(this);
    }

    setRegisteredName(registeredName) {
      _setRegisteredName(this, registeredName);
    }

    getLayer({fallBackToClass = true, throwIfNotFound = true} = {}) {
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

    setLayer(layer) {
      _setLayer(this, layer);
    }

    callParentLayer(methodName, ...args) {
      return _callParentLayer(this, methodName, ...args);
    }

    fork() {
      return _fork(this);
    }
  };

function _getRegisteredName(target) {
  return target._registeredName;
}

function _setRegisteredName(target, registeredName) {
  Object.defineProperty(target, '_registeredName', {value: registeredName});
}

function _getLayer(target, {throwIfNotFound = true} = {}) {
  if (target._layer) {
    return target._layer;
  }
  if (throwIfNotFound) {
    throw new Error(`Layer not found`);
  }
}

function _setLayer(target, layer) {
  Object.defineProperty(target, '_layer', {value: layer});
}

function _callParentLayer(target, methodName, ...args) {
  const layer = target.getLayer();
  const query = _buildQuery(target, methodName, ...args);
  return syncOrAsync(layer.sendQuery(query), ({result}) => result);
}

function _buildQuery(target, methodName, ...args) {
  if (typeof target === 'function') {
    // Class invocation
    return {
      [`${target.getRegisteredName()}=>`]: {
        [`${methodName}=>result`]: {
          '([])': args
        }
      }
    };
  }

  // Instance invocation
  return {
    '<=': target,
    [`${methodName}=>result`]: {
      '([])': args
    },
    '=>changes': true
  };
}

function _fork(target) {
  if (typeof target === 'function') {
    // Class forking
    const Base = target;
    return class extends target {
      static [Symbol.hasInstance](instance) {
        return instance instanceof Base;
      }
    };
  }

  // Instance forking
  return Object.create(target);
}

export function isRegisterable(value) {
  return typeof value?.getLayer === 'function';
}

// Decorator
export function callParentLayer() {
  return function (target, name, descriptor) {
    descriptor.value = function (...args) {
      return this.callParentLayer(name, ...args);
    };
    delete descriptor.initializer;
    delete descriptor.writable;
  };
}
