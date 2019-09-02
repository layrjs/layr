import React from 'react';
import {isObservable} from '@liaison/observable';

import {useModel} from './hooks';

export function view() {
  return function (target, name, {value: Component, configurable, enumerable}) {
    if (typeof Component !== 'function') {
      throw new Error(`@view() can only be used on functions`);
    }

    return {
      configurable,
      enumerable,
      get() {
        const BoundComponent = (props, context) => {
          if (!context) {
            // The component has been called directly (without React.createElement())
            // TODO: This sounds quite fragile, so if possible, let's get rid of this
            return <BoundComponent {...props} />;
          }
          if (isObservable(this)) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useModel(this);
          }
          return Component.call(this, props, context);
        };
        BoundComponent.displayName = name;

        Object.defineProperty(this, name, {
          configurable: true,
          writable: true,
          // NOT enumerable when it's a bound method
          enumerable: false,
          value: BoundComponent
        });

        return BoundComponent;
      }
    };
  };
}
