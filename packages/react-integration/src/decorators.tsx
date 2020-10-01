import {Component, isComponentClassOrInstance} from '@liaison/component';
import React from 'react';
import {PlainObject, hasOwnProperty} from 'core-helpers';

import {useObserve} from './hooks';

/**
 * Decorates a method of a Liaison [component](https://liaison.dev/docs/v1/reference/component) so it be can used as a React component.
 *
 * Like any React component, the method can receive some properties as first parameter and return some [React elements](https://reactjs.org/docs/rendering-elements.html) to render (or `null` if it doesn't render anything).
 *
 * The decorator binds the method to a specific component, so when the method is executed by React (via, for example, a reference included in a [JSX expression](https://reactjs.org/docs/introducing-jsx.html)), it has access to the bound component through `this`.
 *
 * Also, the decorator observes the attributes of the bound component, so when the value of an attribute changes, the React component is automatically re-rendered.
 *
 * @example
 * ```
 * import {Component, attribute} from '﹫liaison/component';
 * import React from 'react';
 * import ReactDOM from 'react-dom';
 * import {view} from '﹫liaison/react-integration';
 *
 * class Person extends Component {
 *   ﹫attribute('string') firstName = '';
 *
 *   ﹫attribute('string') lastName = '';
 *
 *   ﹫view() FullName() {
 *     return <span>{`${this.firstName} ${this.fullName}`}</span>;
 *   }
 * }
 *
 * const person = new Person({firstName: 'Alan', lastName: 'Turing'});
 *
 * ReactDOM.render(<person.FullName />, document.getElementById('root'));
 * ```
 *
 * @category Decorators
 * @decorator
 */
export function view(options: {observe?: boolean} = {}) {
  const {observe = true} = options;

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

            if (observe) {
              useObserve(this);
            }

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
