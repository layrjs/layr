import React from 'react';
import {isModel} from '@liaison/model';

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
        if (!Object.prototype.hasOwnProperty.call(this, '__boundComponents')) {
          this.__boundComponents = {};
        }

        let BoundComponent = this.__boundComponents[name];

        if (!BoundComponent) {
          BoundComponent = (props, context) => {
            if (!context) {
              // The component has been called directly (without React.createElement())
              // TODO: This sounds quite fragile, so if possible, let's get rid of this
              return <BoundComponent {...props} />;
            }
            if (isModel(this)) {
              useModel(this);
            }
            return Component.call(this, props, context);
          };
          BoundComponent.displayName = name;

          this.__boundComponents[name] = BoundComponent;
        }

        return BoundComponent;
      }
    };
  };
}
