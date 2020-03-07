import {hasOwnProperty} from 'core-helpers';

export const Observable = (Base = Object) => {
  if (typeof Base !== 'function') {
    throw new Error('Cannot construct an Observable from a base that is not a class');
  }

  if (isObservable(Base)) {
    return Base;
  }

  class Observable extends Base {}

  const classAndInstanceMethods = {
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

  Object.assign(Observable, classAndInstanceMethods);
  Object.assign(Observable.prototype, classAndInstanceMethods);

  return Observable;
};

export function createObservable(target) {
  if (!canBeObserved(target)) {
    throw new Error(
      `Cannot create an observable from a target that is not an object, an array, or a function`
    );
  }

  if (isObservable(target)) {
    return target;
  }

  if (
    'addObserver' in target ||
    'removeObserver' in target ||
    'callObservers' in target ||
    'isObservable' in target
  ) {
    throw new Error(
      `Observable target cannot own or inherit a property named 'addObserver', 'removeObserver', 'callObservers' or 'isObservable'`
    );
  }

  const observers = new ObserverSet();

  const handleAddObserver = function(observer) {
    observers.add(observer);
  };

  const handleRemoveObserver = function(observer) {
    observers.remove(observer);
  };

  const handleCallObservers = function({_observerStack} = {}) {
    observers.call({_observerStack});
  };

  const handleIsObservable = function(object) {
    return isObservable(object);
  };

  const handler = {
    has(target, key) {
      if (
        key === 'addObserver' ||
        key === 'removeObserver' ||
        key === 'callObservers' ||
        key === 'isObservable'
      ) {
        return true;
      }

      return Reflect.has(target, key);
    },

    get(target, key) {
      if (key === 'addObserver') {
        return handleAddObserver;
      }

      if (key === 'removeObserver') {
        return handleRemoveObserver;
      }

      if (key === 'callObservers') {
        return handleCallObservers;
      }

      if (key === 'isObservable') {
        return handleIsObservable;
      }

      return Reflect.get(target, key);
    },

    set(target, key, nextValue) {
      if (
        key === 'addObserver' ||
        key === 'removeObserver' ||
        key === 'callObservers' ||
        key === 'isObservable'
      ) {
        throw new Error(
          `Cannot set a property named 'addObserver', 'removeObserver', 'callObservers' or 'isObservable' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);

      const result = Reflect.set(target, key, nextValue);

      if (nextValue?.valueOf() !== previousValue?.valueOf()) {
        if (isObservable(previousValue)) {
          previousValue.removeObserver(handleCallObservers);
        }
        if (isObservable(nextValue)) {
          nextValue.addObserver(handleCallObservers);
        }
        handleCallObservers();
      }

      return result;
    },

    deleteProperty(target, key) {
      if (
        key === 'addObserver' ||
        key === 'removeObserver' ||
        key === 'callObservers' ||
        key === 'isObservable'
      ) {
        throw new Error(
          `Cannot delete a property named 'addObserver', 'removeObserver', 'callObservers' or 'isObservable' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);
      if (isObservable(previousValue)) {
        previousValue.removeObserver(handleCallObservers);
      }

      const result = Reflect.deleteProperty(target, key);
      handleCallObservers();
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
      throw new Error(`Cannot add an observer that is not a function or an observable`);
    }

    this._observers.push(observer);
  }

  remove(observer) {
    if (!(typeof observer === 'function' || isObservable(observer))) {
      throw new Error(`Cannot remove an observer that is not a function or an observable`);
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
          observer.callObservers({_observerStack});
        }
      } finally {
        _observerStack.delete(observer);
      }
    }
  }
}

export function isObservable(object) {
  return typeof object?.isObservable === 'function';
}

export function canBeObserved(target) {
  return (
    (typeof target === 'object' && target !== null && !(target instanceof Date)) ||
    typeof target === 'function'
  );
}
