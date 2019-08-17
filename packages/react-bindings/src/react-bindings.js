import {useEffect} from 'react';
import useForceUpdate from 'use-force-update';

// === React hooks ===

export function useModel(model) {
  const forceUpdate = useForceUpdate();

  useEffect(function () {
    const handleChange = function () {
      forceUpdate();
    };
    model.observe(handleChange);
    return function () {
      model.unobserve(handleChange);
    };
  });
}

// === Decorators ===

export function view() {
  return function (target, name, {value: component, configurable, enumerable}) {
    // Credits: the 'autobind' logic comes from https://github.com/jayphelps/core-decorators/blob/6d9703e15414abdd093290697e85b663eb86455b/src/autobind.js#L48

    if (typeof component !== 'function') {
      throw new Error(`@view() can only be used on functions`);
    }

    const {constructor} = target;

    return {
      configurable,
      enumerable,
      get() {
        if (this === target) {
          // Someone accesses the property directly on the prototype on which it is
          // actually defined on
          return component;
        }

        if (
          this.constructor !== constructor &&
          Object.getPrototypeOf(this).constructor === constructor
        ) {
          // Someone accesses the property directly on a prototype but it was found
          // up the chain, not defined directly on it
          return component;
        }

        const model = this;
        const boundComponent = function () {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useModel(model);
          return component.call(model);
        };
        boundComponent.displayName = name;

        Object.defineProperty(this, name, {
          configurable: true,
          writable: true,
          // NOT enumerable when it's a bound method
          enumerable: false,
          value: boundComponent
        });

        return boundComponent;
      }
    };
  };
}
