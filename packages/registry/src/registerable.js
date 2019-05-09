export const Registerable = (Base = Object) =>
  class Registerable extends Base {
    // === Class registration ===

    static getRegisteredName() {
      return this._registeredName;
    }

    static setRegisteredName(registeredName) {
      this._registeredName = registeredName;
    }

    static getRegistry({throwIfNotFound = true} = {}) {
      if (this._registry) {
        return this._registry;
      }
      if (throwIfNotFound) {
        throw new Error(`Registry not found`);
      }
    }

    static setRegistry(registry) {
      Object.defineProperty(this, '_registry', {value: registry});
    }

    static async callRemote(methodName, ...args) {
      const registry = this.getRegistry();
      const query = {
        [`${this.getRegisteredName()}=>`]: {
          [`${methodName}=>result`]: {
            '([])': args
          }
        }
      };
      const {result} = await registry.sendQuery(query);
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

    getRegistry(options) {
      return this.constructor.getRegistry.call(this, options);
    }

    setRegistry(registry) {
      this.constructor.setRegistry.call(this, registry);
    }

    async callRemote(methodName, ...args) {
      const registry = this.constructor.getRegistry();
      const query = {
        '<=': this,
        [`${methodName}=>result`]: {
          '([])': args
        },
        '=>changes': true
      };
      const {result} = await registry.sendQuery(query);
      return result;
    }

    fork() {
      return Object.create(this);
    }
  };

export function isRegisterable(value) {
  return typeof value?.getRegistry === 'function';
}

export function remoteMethod() {
  return function (target, name, descriptor) {
    descriptor.value = async function (...args) {
      return await this.callRemote(name, ...args);
    };
    delete descriptor.initializer;
    delete descriptor.writable;
  };
}
