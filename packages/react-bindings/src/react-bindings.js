import {useEffect} from 'react';
import useForceUpdate from 'use-force-update';
import {isObservable} from '@liaison/observable';

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
    if (typeof component !== 'function') {
      throw new Error(`@view() can only be used on functions`);
    }

    return {
      configurable,
      enumerable,
      get() {
        const model = this;

        const boundComponent = function (props) {
          if (isObservable(model)) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useModel(model);
          }
          return component.call(model, props);
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
