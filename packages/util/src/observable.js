export class Observable {
  constructor(object) {
    return createObservable(object);
  }

  static [Symbol.hasInstance](object) {
    return (
      typeof object === 'object' &&
      object !== null &&
      typeof object.observe === 'function' &&
      typeof object.unobserve === 'function'
    );
  }
}

function createObservable(target) {
  if (typeof target !== 'object' || target === null) {
    throw new Error(`Observable target must be an object or an array`);
  }

  if ('observe' in target || 'unobserve' in target) {
    throw new Error(
      `Observable target cannot own or inherit a property named 'observe' or 'unobserve'`
    );
  }

  const observers = [];

  const addObserver = function (observer) {
    if (typeof observer !== 'function') {
      throw new Error(`'observer' must be a function`);
    }

    observers.push(observer);
  };

  const removeObserver = function (observer) {
    if (typeof observer !== 'function') {
      throw new Error(`'observer' must be a function`);
    }

    const index = observers.indexOf(observer);
    if (index !== -1) {
      observers.splice(index, 1);
    }
  };

  const callObservers = function () {
    for (const observer of observers) {
      observer();
    }
  };

  const handler = {
    has(target, key) {
      if (key === 'observe' || key === 'unobserve') {
        return true;
      }

      return Reflect.has(target, key);
    },

    get(target, key) {
      if (key === 'observe') {
        return addObserver;
      }

      if (key === 'unobserve') {
        return removeObserver;
      }

      return Reflect.get(target, key);
    },

    set(target, key, nextValue) {
      if (key === 'observe' || key === 'unobserve') {
        throw new Error(
          `Cannot set a property named 'observe' or 'unobserve' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);

      if (previousValue !== nextValue) {
        if (previousValue instanceof Observable) {
          previousValue.unobserve(callObservers);
        }
        if (nextValue instanceof Observable) {
          nextValue.observe(callObservers);
        }
      }

      const result = Reflect.set(target, key, nextValue);
      callObservers();
      return result;
    },

    deleteProperty(target, key) {
      if (key === 'observe' || key === 'unobserve') {
        throw new Error(
          `Cannot delete a property named 'observe' or 'unobserve' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);
      if (previousValue instanceof Observable) {
        previousValue.unobserve(callObservers);
      }

      const result = Reflect.deleteProperty(target, key);
      callObservers();
      return result;
    }
  };

  return new Proxy(target, handler);
}
