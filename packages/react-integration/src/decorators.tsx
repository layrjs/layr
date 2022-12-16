import {Component, isComponentClassOrInstance} from '@layr/component';
import {
  RoutableComponent,
  route,
  RouteOptions,
  wrapper,
  WrapperOptions,
  Pattern
} from '@layr/routable';
import {PlainObject, hasOwnProperty} from 'core-helpers';

import {useObserve} from './hooks';

type ViewOption = {observe?: boolean};

/**
 * Decorates a method of a Layr [component](https://layrjs.com/docs/v2/reference/component) so it be can used as a React component.
 *
 * Like any React component, the method can receive some properties as first parameter and return some React elements to render.
 *
 * The decorator binds the method to a specific component, so when the method is executed by React (via, for example, a reference included in a [JSX expression](https://reactjs.org/docs/introducing-jsx.html)), it has access to the bound component through `this`.
 *
 * Also, the decorator observes the attributes of the bound component, so when the value of an attribute changes, the React component is automatically re-rendered.
 *
 * @example
 * ```
 * import {Component, attribute} from '﹫layr/component';
 * import React from 'react';
 * import ReactDOM from 'react-dom';
 * import {view} from '﹫layr/react-integration';
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
export function view(options: ViewOption = {}) {
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
          BoundReactComponent = (...args: any[]) => {
            if (observe) {
              useObserve(this);
            }

            return ReactComponent.apply(this, args);
          };

          BoundReactComponent.displayName = this.describeComponentProperty(name);

          Object.defineProperty(BoundReactComponent, '__isView', {value: true});

          this.__boundReactComponents[name] = BoundReactComponent;
        }

        return BoundReactComponent;
      }
    };
  };
}

/**
 * A convenience decorator that combines the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) and [`@view()`](https://layrjs.com/docs/v2/reference/react-integration#view-decorator) decorators.
 *
 * Typically, you should use this decorator to implement the pages of your app.
 *
 * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
 * @param [options] An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the route is created.
 *
 * @examplelink See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
 *
 * @category Decorators
 * @decorator
 */
export function page(pattern: Pattern, options: ViewOption & RouteOptions = {}) {
  return function (
    target: typeof RoutableComponent | RoutableComponent,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor = view(options)(target, name, descriptor);
    descriptor = route(pattern, options)(target, name, descriptor);
    return descriptor;
  };
}

/**
 * A convenience decorator that combines the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) and [`@view()`](https://layrjs.com/docs/v2/reference/react-integration#view-decorator) decorators.
 *
 * Typically, you should use this decorator to implement the layouts of your app.
 *
 * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
 * @param [options] An object specifying the options to pass to the `Wrapper`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the wrapper is created.
 *
 * @examplelink See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
 *
 * @category Decorators
 * @decorator
 */
export function layout(pattern: Pattern, options: ViewOption & WrapperOptions = {}) {
  return function (
    target: typeof RoutableComponent | RoutableComponent,
    name: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor = view(options)(target, name, descriptor);
    descriptor = wrapper(pattern, options)(target, name, descriptor);
    return descriptor;
  };
}
