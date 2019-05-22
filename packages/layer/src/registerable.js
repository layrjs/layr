export const Registerable = (Base = Object) =>
  class Registerable extends Base {
    // === Class registration ===

    static getRegisteredName() {
      return this._registeredName;
    }

    static setRegisteredName(registeredName) {
      Object.defineProperty(this, '_registeredName', {value: registeredName});
    }

    static getLayer({throwIfNotFound = true} = {}) {
      if (this._layer) {
        return this._layer;
      }
      if (throwIfNotFound) {
        throw new Error(`Layer not found`);
      }
    }

    static setLayer(layer) {
      Object.defineProperty(this, '_layer', {value: layer});
    }

    static async callParentLayer(methodName, ...args) {
      const layer = this.getLayer();
      const query = {
        [`${this.getRegisteredName()}=>`]: {
          [`${methodName}=>result`]: {
            '([])': args
          }
        }
      };
      const {result} = await layer.sendQuery(query);
      return result;
    }

    static fork() {
      const Base = this;
      return class extends this {
        static [Symbol.hasInstance](instance) {
          return instance instanceof Base;
        }
      };
    }

    // === Instance registration ===

    getRegisteredName() {
      return this.constructor.getRegisteredName.call(this);
    }

    setRegisteredName(registeredName) {
      this.constructor.setRegisteredName.call(this, registeredName);
    }

    getLayer({throwIfNotFound = true} = {}) {
      return this.constructor.getLayer.call(this, {throwIfNotFound});
    }

    setLayer(layer) {
      this.constructor.setLayer.call(this, layer);
    }

    async callParentLayer(methodName, ...args) {
      const layer = this.constructor.getLayer();
      const query = {
        '<=': this,
        [`${methodName}=>result`]: {
          '([])': args
        },
        '=>changes': true
      };
      const {result} = await layer.sendQuery(query);
      return result;
    }

    fork() {
      return Object.create(this);
    }
  };

export function isRegisterable(value) {
  return typeof value?.getLayer === 'function';
}

export function callParentLayer() {
  return function (target, name, descriptor) {
    descriptor.value = async function (...args) {
      return await this.callParentLayer(name, ...args);
    };
    delete descriptor.initializer;
    delete descriptor.writable;
  };
}
