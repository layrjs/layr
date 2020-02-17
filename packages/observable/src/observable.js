import {hasOwnProperty} from 'core-helpers';

export const Observable = (Base = Object) => {
  if (typeof Base !== 'function') {
    throw new Error('Cannot construct an Observable from a base that is not a class');
    }

  if (isObservable(Base)) {
    return Base;
    }

  class Observable extends Base {}

  const methods = {
    addObserver(observer) {
      this.__getObservers().add(observer);
    },

    removeObserver(observer) {
      this.__getObservers().remove(observer);
    },

    callObservers({_observerStack} = {}) {
      this.__getObservers().call({_observerStack});
    },

    __getObservers() {
      if (!hasOwnProperty(this, '__observers')) {
        Object.defineProperty(this, '__observers', {value: new ObserverSet()});
      }
      return this.__observers;
    },

    isObservable(object) {
      return isObservable(object);
    }
  };

  Object.assign(Observable, methods);
  Object.assign(Observable.prototype, methods);

  return Observable;
};

export function createObservable(target) {
  if (!canBecomeObservable(target)) {
    throw new Error(`Observable target must be an object or an array`);
  }

  if (isObservable(target)) {
    return target;
  }

  if ('$observe' in target || '$unobserve' in target || '$notify' in target) {
    throw new Error(
      `Observable target cannot own or inherit a property named '$observe', '$unobserve' or '$notify'`
    );
  }

  const observers = new ObserverSet();

  const addObserver = function(observer) {
    observers.add(observer);
  };

  const removeObserver = function(observer) {
    observers.remove(observer);
  };

  const callObservers = function({_observerStack} = {}) {
    observers.call({_observerStack});
  };

  const handler = {
    has(target, key) {
      if (key === '$observe' || key === '$unobserve' || key === '$notify') {
        return true;
      }

      return Reflect.has(target, key);
    },

    get(target, key) {
      if (key === '$observe') {
        return addObserver;
      }

      if (key === '$unobserve') {
        return removeObserver;
      }

      if (key === '$notify') {
        return callObservers;
      }

      return Reflect.get(target, key);
    },

    set(target, key, nextValue) {
      if (key === '$observe' || key === '$unobserve' || key === '$notify') {
        throw new Error(
          `Cannot set a property named '$observe', '$unobserve' or '$notify' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);

      const result = Reflect.set(target, key, nextValue);

      if (nextValue?.valueOf() !== previousValue?.valueOf()) {
        if (isObservable(previousValue)) {
          previousValue.$unobserve(callObservers);
        }
        if (isObservable(nextValue)) {
          nextValue.$observe(callObservers);
        }
        callObservers();
      }

      return result;
    },

    deleteProperty(target, key) {
      if (key === '$observe' || key === '$unobserve' || key === '$notify') {
        throw new Error(
          `Cannot delete a property named '$observe', '$unobserve' or '$notify' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);
      if (isObservable(previousValue)) {
        previousValue.$unobserve(callObservers);
      }

      const result = Reflect.deleteProperty(target, key);
      callObservers();
      return result;
    }
  };

  return new Proxy(target, handler);
}

export class ObserverSet {
  constructor() {
    this._observers = [];
  }

  add(observer) {
    if (!(typeof observer === 'function' || isObservable(observer))) {
      throw new Error(`'observer' must be a function or an observable`);
    }

    this._observers.push(observer);
  }

  remove(observer) {
    if (!(typeof observer === 'function' || isObservable(observer))) {
      throw new Error(`'observer' must be a function or an observable`);
    }

    const index = this._observers.indexOf(observer);
    if (index !== -1) {
      this._observers.splice(index, 1);
    }
  }

  call({_observerStack = new Set()} = {}) {
    for (const observer of this._observers) {
      if (_observerStack.has(observer)) {
        continue; // Avoid looping indefinitely when a circular reference is encountered
      }

      _observerStack.add(observer);
      try {
        if (typeof observer === 'function') {
          observer({_observerStack});
        } else {
          // The observer is an observable
          observer.$notify({_observerStack});
        }
      } finally {
        _observerStack.delete(observer);
      }
    }
  }
}

export function isObservable(object) {
  return (
    typeof object === 'object' &&
    object !== null &&
    typeof object.$observe === 'function' &&
    typeof object.$unobserve === 'function' &&
    typeof object.$notify === 'function'
  );
}

export function canBecomeObservable(target) {
  return typeof target === 'object' && target !== null && !(target instanceof Date);
}
