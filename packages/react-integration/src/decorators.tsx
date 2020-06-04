import {Component, isComponentClassOrInstance} from '@liaison/component';
import React from 'react';
import {PlainObject, hasOwnProperty} from 'core-helpers';

import {useObserve} from './hooks';

export function view() {
  return function (
    target: typeof Component | Component,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    const {value: ReactComponent, configurable, enumerable} = descriptor;

    if (
      !(
        isComponentClassOrInstance(target) &&
        typeof ReactComponent === 'function' &&
        enumerable === false
      )
    ) {
      throw new Error(
        `@view() should be used to decorate a component method (property: '${name}')`
      );
    }

    return {
      configurable,
      enumerable,
      get(this: (typeof Component | Component) & {__boundReactComponents: PlainObject}) {
        if (!hasOwnProperty(this, '__boundReactComponents')) {
          Object.defineProperty(this, '__boundReactComponents', {value: Object.create(null)});
        }

        let BoundReactComponent = this.__boundReactComponents[name];

        if (BoundReactComponent === undefined) {
          BoundReactComponent = (props: any, context: any) => {
            if (context === undefined) {
              // The component has been called directly (without React.createElement())
              return <BoundReactComponent {...props} />;
            }

            useObserve(this);

            return ReactComponent.call(this, props, context);
          };

          BoundReactComponent.displayName = this.describeComponentProperty(name);

          this.__boundReactComponents[name] = BoundReactComponent;
        }

        return BoundReactComponent;
      }
    };
  };
}
