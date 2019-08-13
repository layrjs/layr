export class Observable {
  constructor(object) {
    return createObservable(object);
  }

  static [Symbol.hasInstance](object) {
    return (
      typeof object === 'object' &&
      object !== null &&
      typeof object.observe === 'function' &&
      typeof object.unobserve === 'function' &&
      typeof object.notify === 'function'
    );
  }
}

function createObservable(target) {
  if (typeof target !== 'object' || target === null) {
    throw new Error(`Observable target must be an object or an array`);
  }

  if (target instanceof Observable) {
    return target;
  }

  if ('observe' in target || 'unobserve' in target || 'notify' in target) {
    throw new Error(
      `Observable target cannot own or inherit a property named 'observe', 'unobserve' or 'notify'`
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
      if (key === 'observe' || key === 'unobserve' || key === 'notify') {
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

      if (key === 'notify') {
        return callObservers;
      }

      return Reflect.get(target, key);
    },

    set(target, key, nextValue) {
      if (key === 'observe' || key === 'unobserve' || key === 'notify') {
        throw new Error(
          `Cannot set a property named 'observe', 'unobserve' or 'notify' in an observed object`
        );
      }

      const previousValue = Reflect.get(target, key);

      const valueChanged = nextValue !== previousValue;

      if (valueChanged) {
        if (previousValue instanceof Observable) {
          previousValue.unobserve(callObservers);
        }
        if (nextValue instanceof Observable) {
          nextValue.observe(callObservers);
        }
      }

      const result = Reflect.set(target, key, nextValue);

      if (valueChanged) {
        callObservers();
      }

      return result;
    },

    deleteProperty(target, key) {
      if (key === 'observe' || key === 'unobserve' || key === 'notify') {
        throw new Error(
          `Cannot delete a property named 'observe', 'unobserve' or 'notify' in an observed object`
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
