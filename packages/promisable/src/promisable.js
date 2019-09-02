import {isPromise} from './is-promise';

export function createPromisable(target, promise) {
  if (!(typeof target === 'object' && target !== null)) {
    throw new Error(`Promisable target must be an object or an array`);
  }

  if (!isPromise(promise)) {
    throw new Error(`'promise' parameter is not a promise`);
  }

  const getPromise = function () {
    return promise;
  };

  const then = function (resolve, reject) {
    return promise.then(
      () => {
        return resolve ? resolve(target) : target;
      },
      reason => {
        return reject ? reject(reason) : reason;
      }
    );
  };

  const catchFunc = function (reject) {
    return then(undefined, reject);
  };

  const handler = {
    has(target, name) {
      if (
        name === 'getPromise' ||
        name === 'then' ||
        name === 'catch' ||
        name === '__isPromisable'
      ) {
        return true;
      }

      return Reflect.has(target, name);
    },

    get(target, name) {
      if (name === 'getPromise') {
        return getPromise;
      }

      if (name === 'then') {
        return then;
      }

      if (name === 'catch') {
        return catchFunc;
      }

      if (name === '__isPromisable') {
        return true;
      }

      const descriptor = getPropertyDescriptor(target, name);
      if (descriptor?.get) {
        // Make sure we call getters with the proxy as receiver
        return descriptor.get.call(proxy);
      }

      return Reflect.get(target, name);
    }
  };

  const proxy = new Proxy(target, handler);

  return proxy;
}

export function isPromisable(value) {
  return typeof value === 'object' && value !== null && value.__isPromisable === true;
}

// TODO: Consider memoizing results
function getPropertyDescriptor(object, name) {
  if (typeof object !== 'object' || object === null) {
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
