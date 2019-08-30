import {isPromise} from './is-promise';

export function createPromiseWithStatus(promise) {
  if (!isPromise(promise)) {
    throw new Error('Expected a promise');
  }

  if (isPromiseWithStatus(promise)) {
    return promise;
  }

  const promiseWithStatus = promise.then(
    value => {
      promiseWithStatus.status = 'fulfilled';
      promiseWithStatus.fulfilledValue = value;
      return value;
    },
    reason => {
      promiseWithStatus.status = 'rejected';
      promiseWithStatus.rejectionReason = reason;
      throw reason;
    }
  );

  promiseWithStatus.status = 'pending';
  promiseWithStatus.originalPromise = promise;

  return promiseWithStatus;
}

export function isPromiseWithStatus(value) {
  return isPromise(value) && typeof value.status === 'string' && isPromise(value.originalPromise);
}
