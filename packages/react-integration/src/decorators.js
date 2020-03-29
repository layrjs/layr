import React from 'react';
import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

import {useObserve} from './hooks';

export function view() {
  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    const {value: Component, configurable, enumerable} = descriptor;

    if (!(typeof target?.getComponentName === 'function' && typeof Component === 'function')) {
      throw new Error(`@view() can only be used on component methods`);
    }

    return {
      configurable,
      enumerable,
      get() {
        if (!hasOwnProperty(this, '__boundComponents')) {
          this.__boundComponents = Object.create(null);
        }

        let BoundComponent = this.__boundComponents[name];

        if (BoundComponent === undefined) {
          BoundComponent = (props, context) => {
            if (context === undefined) {
              // The component has been called directly (without React.createElement())
              return <BoundComponent {...props} />;
            }

            if (typeof this.isObservable === 'function') {
              useObserve(this);
            }

            return Component.call(this, props, context);
          };

          BoundComponent.displayName = `${this.getComponentName()}.${name}`;

          this.__boundComponents[name] = BoundComponent;
        }

        return BoundComponent;
      }
    };
  };
}
