import {isPromise} from './is-promise';
import {createPromiseWithStatus} from './promise-with-status';

export const Promisable = (Base = Object) => {
  const Promisable = class Promisable extends Base {};

  assignPromisableProperties(Promisable.prototype);

  return Promisable;
};

export function makePromisable(target) {
  if (!canBecomePromisable(target)) {
    throw new Error(`Promisable target must be an object or an array`);
  }

  if (isPromisable(target)) {
    return target;
  }

  assignPromisableProperties(target);

  return target;
}

export function isPromisable(value) {
  return typeof value === 'object' && value !== null && value.__isPromisable === true;
}

export function canBecomePromisable(target) {
  return typeof target === 'object' && target !== null;
}

function assignPromisableProperties(target) {
  for (const [name, value] of Object.entries(promisableProperties)) {
    Object.defineProperty(target, name, {value});
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

  then(resolve, reject) {
    return Promise.all(this.getPromisesWithStatus()).then(
      value => {
        this.clearAllPromises();
        return resolve(value);
      },
      reason => {
        this.clearAllPromises();
        return reject(reason);
      }
    );
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
    this.getPromisesWithStatus().length = 0;
  },

  __isPromisable: true
};
