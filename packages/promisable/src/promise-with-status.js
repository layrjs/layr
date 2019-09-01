import {ObserverSet} from '@liaison/observable';

import {isPromise} from './is-promise';

export function createPromiseWithStatus(promise) {
  if (!isPromise(promise)) {
    throw new Error('Expected a promise');
  }

  if (isPromiseWithStatus(promise)) {
    return promise;
  }

  const observers = new ObserverSet();

  const promiseWithStatus = promise.then(
    function (value) {
      promiseWithStatus.status = 'fulfilled';
      promiseWithStatus.fulfilledValue = value;
      observers.call();
      return value;
    },
    function (reason) {
      promiseWithStatus.status = 'rejected';
      promiseWithStatus.rejectionReason = reason;
      observers.call();
      throw reason;
    }
  );

  promiseWithStatus.status = 'pending';

  promiseWithStatus.originalPromise = promise;

  promiseWithStatus.observe = function (observer) {
    observers.add(observer);
  };

  promiseWithStatus.unobserve = function (observer) {
    observers.remove(observer);
  };

  return promiseWithStatus;
}

export function isPromiseWithStatus(value) {
  return isPromise(value) && typeof value.status === 'string' && isPromise(value.originalPromise);
}
