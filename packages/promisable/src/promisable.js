import {isObservable} from '@liaison/observable';

import {isPromise} from './is-promise';
import {createPromiseWithStatus} from './promise-with-status';

export const Promisable = (Base = Object) => {
  const Promisable = class Promisable extends Base {};

  definePromisableProperties(Promisable.prototype);

  return Promisable;
};

export function createPromisable(target) {
  if (!canBecomePromisable(target)) {
    throw new Error(`Promisable target must be an object or an array`);
  }

  if (isPromisable(target)) {
    return target;
  }

  const {get: then} = Object.getOwnPropertyDescriptor(promisableProperties, 'then');

  const handler = {
    has(target, name) {
      if (Object.prototype.hasOwnProperty.call(promisableProperties, name)) {
        return true;
      }

      return Reflect.has(target, name);
    },

    get(target, name) {
      if (name === 'then') {
        // Since 'then' is a getter, it must be called explicity with the proxy as receiver
        return then.call(proxy);
      }

      if (Object.prototype.hasOwnProperty.call(promisableProperties, name)) {
        target = promisableProperties;
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

export function canBecomePromisable(target) {
  return typeof target === 'object' && target !== null;
}

function definePromisableProperties(target) {
  for (const name of Object.keys(promisableProperties)) {
    if (name in target) {
      throw new Error(`A property named '${name}' already exists in the target object`);
    }

    const {value, get} = Object.getOwnPropertyDescriptor(promisableProperties, name);

    Object.defineProperty(target, name, {
      ...(value && {value, writable: false}),
      ...(get && {get}),
      configurable: false,
      enumerable: false
    });
  }
}

const promisableProperties = {
  addPromise(promise) {
    if (!isPromise(promise)) {
      throw new Error('Expected a promise');
    }

    if (this.isRejected()) {
      throw new Error(
        `Cannot add a new promise when an older one has been rejected. You might want to call clearAllPromises() before calling addPromise().`
      );
    }

    const promiseWithStatus = createPromiseWithStatus(promise);

    if (isObservable(this)) {
      promiseWithStatus.observe(this);
    }

    this.getPromisesWithStatus().push(promiseWithStatus);

    return promiseWithStatus;
  },

  isPending() {
    return (
      this.getPromisesWithStatus().some(promise => promise.status === 'pending') &&
      !this.getPromisesWithStatus().some(promise => promise.status === 'rejected')
    );
  },

  isFulfilled() {
    return this.getPromisesWithStatus().every(promise => promise.status === 'fulfilled');
  },

  isRejected() {
    return this.getPromisesWithStatus().some(promise => promise.status === 'rejected');
  },

  getFulfilledValues() {
    return this.getPromisesWithStatus()
      .filter(promise => promise.status === 'fulfilled')
      .map(promise => promise.fulfilledValue);
  },

  getRejectionReasons() {
    return this.getPromisesWithStatus()
      .filter(promise => promise.status === 'rejected')
      .map(promise => promise.rejectionReason);
  },

  get then() {
    const promisesWithStatus = this.getPromisesWithStatus();

    if (promisesWithStatus.length === 0) {
      return undefined;
    }

    return (resolve, reject) => {
      return Promise.all(promisesWithStatus).then(
        () => {
          this.clearAllPromises();
          return resolve ? resolve(this) : this;
        },
        reason => {
          this.clearAllPromises();
          return reject ? reject(reason) : reason;
        }
      );
    };
  },

  catch(reject) {
    return this.then(undefined, reject);
  },

  getPromises() {
    return this.getPromisesWithStatus().map(promiseWithStatus => promiseWithStatus.originalPromise);
  },

  getPromisesWithStatus() {
    if (!Object.prototype.hasOwnProperty.call(this, '_promisesWithStatus')) {
      Object.defineProperty(this, '_promisesWithStatus', {value: []});
    }
    return this._promisesWithStatus;
  },

  clearAllPromises() {
    const promisesWithStatus = this.getPromisesWithStatus();

    if (isObservable(this)) {
      for (const promiseWithStatus of promisesWithStatus) {
        promiseWithStatus.unobserve(this);
      }
    }

    promisesWithStatus.length = 0;
  },

  __isPromisable: true
};
