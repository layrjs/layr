import {
  Component,
  isComponentClass,
  assertIsComponentClass,
  isComponentValueTypeInstance
} from '@layr/component';
import {Navigator, assertIsNavigatorInstance, normalizeURL} from '@layr/navigator';
import {hasOwnProperty, getTypeOf, Constructor} from 'core-helpers';
import debugModule from 'debug';

import {Route, RouteOptions} from './route';
import {Wrapper, WrapperOptions} from './wrapper';
import type {Pattern} from './pattern';
import {isRoutableClass, isRoutableInstance} from './utilities';

const debug = debugModule('layr:routable');
// To display the debug log, set this environment:
// DEBUG=layr:routable DEBUG_DEPTH=10

/**
 * Extends a [`Component`](https://layrjs.com/docs/v2/reference/component) class with some routing capabilities.
 *
 * #### Usage
 *
 * Call `Routable()` with a [`Component`](https://layrjs.com/docs/v2/reference/component) class to construct a [`RoutableComponent`](https://layrjs.com/docs/v2/reference/routable#routable-component-class) class.
 *
 * Then, you can define some routes or wrappers into this class by using the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) or [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorators.
 *
 * See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.
 *
 * ### RoutableComponent <badge type="primary">class</badge> {#routable-component-class}
 *
 * *Inherits from [`Component`](https://layrjs.com/docs/v2/reference/component).*
 *
 * A `RoutableComponent` class is constructed by calling the `Routable()` mixin ([see above](https://layrjs.com/docs/v2/reference/routable#routable-mixin)).
 *
 * @mixin
 */
export function Routable<T extends Constructor<typeof Component>>(Base: T) {
  if (!isComponentClass(Base)) {
    throw new Error(
      `The Routable mixin should be applied on a component class (received type: '${getTypeOf(
        Base
      )}')`
    );
  }

  if (typeof (Base as any).isRoutable === 'function') {
    return Base as T & typeof Routable;
  }

  class Routable extends Base {
    // === Component Methods ===

    /**
     * See the methods that are inherited from the [`Component`](https://layrjs.com/docs/v2/reference/component#creation) class.
     *
     * @category Component Methods
     */

    // === Navigator ===

    static __navigator: Navigator | undefined;

    static registerNavigator(navigator: Navigator) {
      assertIsNavigatorInstance(navigator);

      Object.defineProperty(this, '__navigator', {value: navigator});
    }

    /**
     * Returns the navigator in which the routable component is registered. If the routable component is not registered in a navigator, an error is thrown.
     *
     * @returns A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator) instance.
     *
     * @example
     * ```
     * Article.getNavigator(); // => navigator instance
     * ```
     *
     * @category Navigator
     */
    static getNavigator() {
      const navigator = this.findNavigator();

      if (navigator === undefined) {
        throw new Error(
          `Couldn't find a navigator from the current routable component (${this.describeComponent()})`
        );
      }

      return navigator;
    }

    /**
     * Returns the navigator in which the routable component is registered. If the routable component is not registered in a navigator, an error is thrown.
     *
     * @returns A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator) instance.
     *
     * @example
     * ```
     * Article.getNavigator(); // => navigator instance
     * ```
     *
     * @category Navigator
     */
    getNavigator() {
      return (this.constructor as typeof Routable).getNavigator();
    }

    static findNavigator() {
      let currentComponent: typeof Component = this;

      while (true) {
        if (isRoutableClass(currentComponent) && currentComponent.__navigator !== undefined) {
          return currentComponent.__navigator;
        }

        const componentProvider = currentComponent.getComponentProvider();

        if (componentProvider === currentComponent) {
          break;
        }

        currentComponent = componentProvider;
      }

      return undefined;
    }

    findNavigator() {
      return (this.constructor as typeof Routable).findNavigator();
    }

    // === Routes ===

    /**
     * Gets a route. If there is no route with the specified name, an error is thrown.
     *
     * @param name The name of the route to get.
     *
     * @returns A [Route](https://layrjs.com/docs/v2/reference/route) instance.
     *
     * @example
     * ```
     * Article.getRoute('View'); // A route instance
     * ```
     *
     * @category Routes
     */
    static get getRoute() {
      return (this.prototype as Routable).getRoute;
    }

    /**
     * Gets a route. If there is no route with the specified name, an error is thrown.
     *
     * @param name The name of the route to get.
     *
     * @returns A [Route](https://layrjs.com/docs/v2/reference/route) instance.
     *
     * @example
     * ```
     * Article.getRoute('View'); // A route instance
     * ```
     *
     * @category Routes
     */
    getRoute(name: string) {
      const route = this.__getRoute(name);

      if (route === undefined) {
        throw new Error(`The route '${name}' is missing (${this.describeComponent()})`);
      }

      return route;
    }

    /**
     * Returns whether the routable component has a route with the specified name.
     *
     * @param name The name of the route to check.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasRoute('View'); // => true
     * ```
     *
     * @category Routes
     */
    static get hasRoute() {
      return (this.prototype as Routable).hasRoute;
    }

    /**
     * Returns whether the routable component has a route with the specified name.
     *
     * @param name The name of the route to check.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasRoute('View'); // => true
     * ```
     *
     * @category Routes
     */
    hasRoute(name: string) {
      return this.__getRoute(name) !== undefined;
    }

    static get __getRoute() {
      return (this.prototype as Routable).__getRoute;
    }

    __getRoute(name: string) {
      const routes = this.__getRoutes();

      return routes.get(name);
    }

    /**
     * Sets a route for a routable component class or instances.
     *
     * Typically, instead of using this method, you would rather use the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.
     *
     * @param name The name of the route.
     * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
     * @param [options] An optional object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the route is created.
     *
     * @returns The [Route](https://layrjs.com/docs/v2/reference/route) instance that was created.
     *
     * @example
     * ```
     * Article.setRoute('View', '/articles', {parameters: {page: 'number?'});
     *
     * Article.prototype.setRoute('View', '/articles/:id', {parameters: {showDetails: 'boolean?'}});
     * ```
     *
     * @category Routes
     */
    static get setRoute() {
      return (this.prototype as Routable).setRoute;
    }

    /**
     * Sets a route for a routable component class or instances.
     *
     * Typically, instead of using this method, you would rather use the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.
     *
     * @param name The name of the route.
     * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
     * @param [options] An optional object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the route is created.
     *
     * @returns The [Route](https://layrjs.com/docs/v2/reference/route) instance that was created.
     *
     * @example
     * ```
     * Article.setRoute('View', '/articles', {parameters: {page: 'number?'});
     *
     * Article.prototype.setRoute('View', '/articles/:id', {parameters: {showDetails: 'boolean?'}});
     * ```
     *
     * @category Routes
     */
    setRoute(name: string, pattern: Pattern, options: RouteOptions = {}) {
      const route = new Route(name, pattern, options);

      const routes = this.__getRoutes(true);

      routes.set(name, route);

      return route;
    }

    static get __callRoute() {
      return (this.prototype as Routable).__callRoute;
    }

    __callRoute(
      rootComponent: typeof Component,
      route: Route,
      identifiers: any,
      params: any,
      wrapperPath: string | undefined,
      request: any
    ) {
      const name = route.getName();

      debug('Calling route %s(%o)', this.describeComponentProperty(name), params);

      const component = instantiateComponent(this, identifiers);

      const method = route.transformMethod((component as any)[name], request);

      const navigator = this.findNavigator();

      if (wrapperPath !== undefined) {
        return callWrapperByPath(
          rootComponent,
          wrapperPath,
          function () {
            if (navigator !== undefined) {
              return navigator.callAddressableMethodWrapper(component, method, params);
            } else {
              return method.call(component, params);
            }
          },
          request
        );
      } else {
        if (navigator !== undefined) {
          return navigator.callAddressableMethodWrapper(component, method, params);
        } else {
          return method.call(component, params);
        }
      }
    }

    /**
     * Finds the first route that matches the specified URL.
     *
     * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
     *
     * @returns When a route is found, returns an object of the shape `{route, identifiers, params}` where `route` is the [route](https://layrjs.com/docs/v2/reference/route) that was found, `identifiers` is a plain object containing the value of some [component identifier attributes](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type), and `params` is a plain object containing the value of some [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type). If no routes were found, returns `undefined`.
     *
     * @example
     * ```
     * const result = Article.prototype.findRouteByURL('/articles/abc123?showDetails=1');
     *
     * result.route; // => A route instance
     * result.identifiers; // => {id: 'abc123'}
     * result.params; // => {showDetails: true}
     * ```
     *
     * @category Routes
     */
    static get findRouteByURL() {
      return (this.prototype as Routable).findRouteByURL;
    }

    /**
     * Finds the first route that matches the specified URL.
     *
     * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
     *
     * @returns When a route is found, returns an object of the shape `{route, identifiers, params}` where `route` is the [route](https://layrjs.com/docs/v2/reference/route) that was found, `identifiers` is a plain object containing the value of some [component identifier attributes](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type), and `params` is a plain object containing the value of some [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type). If no routes were found, returns `undefined`.
     *
     * @example
     * ```
     * const result = Article.prototype.findRouteByURL('/articles/abc123?showDetails=1');
     *
     * result.route; // => A route instance
     * result.identifiers; // => {id: 'abc123'}
     * result.params; // => {showDetails: true}
     * ```
     *
     * @category Routes
     */
    findRouteByURL(url: URL | string, request?: any) {
      const normalizedURL = normalizeURL(url);

      const routes = this.__getRoutes();

      let result:
        | ({
            route: Route;
          } & ReturnType<Route['matchURL']>)
        | undefined;

      for (const route of routes.values()) {
        const routeResult = route.matchURL(normalizedURL, request);

        if (routeResult !== undefined) {
          result = {route, ...routeResult};

          if (!result.route.isCatchAll()) {
            break;
          }
        }
      }

      return result;
    }

    static __routes?: Map<string, Route>;

    __routes?: Map<string, Route>;

    static get __getRoutes() {
      return (this.prototype as Routable).__getRoutes;
    }

    __getRoutes(autoFork = false) {
      if (this.__routes === undefined) {
        Object.defineProperty(this, '__routes', {value: new Map()});
      } else if (autoFork && !hasOwnProperty(this, '__routes')) {
        Object.defineProperty(this, '__routes', {value: new Map(this.__routes)});
      }

      return this.__routes!;
    }

    // === Wrappers ===

    /**
     * Gets a wrapper. If there is no wrapper with the specified name, an error is thrown.
     *
     * @param name The name of the wrapper to get.
     *
     * @returns A [Wrapper](https://layrjs.com/docs/v2/reference/wrapper) instance.
     *
     * @example
     * ```
     * Article.getWrapper('Layout'); => A wrapper instance
     * ```
     *
     * @category Wrappers
     */
    static get getWrapper() {
      return (this.prototype as Routable).getWrapper;
    }

    /**
     * Gets a wrapper. If there is no wrapper with the specified name, an error is thrown.
     *
     * @param name The name of the wrapper to get.
     *
     * @returns A [Wrapper](https://layrjs.com/docs/v2/reference/wrapper) instance.
     *
     * @example
     * ```
     * Article.getWrapper('Layout'); => A wrapper instance
     * ```
     *
     * @category Wrappers
     */
    getWrapper(name: string) {
      const wrapper = this.__getWrapper(name);

      if (wrapper === undefined) {
        throw new Error(`The wrapper '${name}' is missing (${this.describeComponent()})`);
      }

      return wrapper;
    }

    /**
     * Returns whether the routable component has a wrapper with the specified name.
     *
     * @param name The name of the wrapper to check.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasWrapper('Layout'); // => true
     * ```
     *
     * @category Wrappers
     */
    static get hasWrapper() {
      return (this.prototype as Routable).hasWrapper;
    }

    /**
     * Returns whether the routable component has a wrapper with the specified name.
     *
     * @param name The name of the wrapper to check.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasWrapper('Layout'); // => true
     * ```
     *
     * @category Wrappers
     */
    hasWrapper(name: string) {
      return this.__getWrapper(name) !== undefined;
    }

    static get __getWrapper() {
      return (this.prototype as Routable).__getWrapper;
    }

    __getWrapper(name: string) {
      const wrappers = this.__getWrappers();

      return wrappers.get(name);
    }

    /**
     * Sets a wrapper for a routable component class or instances.
     *
     * Typically, instead of using this method, you would rather use the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorator.
     *
     * @param name The name of the wrapper.
     * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
     * @param [options] An optional object specifying the options to pass to the `Wrapper`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the wrapper is created.
     *
     * @returns The [Wrapper](https://layrjs.com/docs/v2/reference/wrapper) instance that was created.
     *
     * @example
     * ```
     * Article.setWrapper('Layout', '/articles');
     *
     * Article.prototype.setWrapper('View', '[/articles]/:id');
     * ```
     *
     * @category Wrappers
     */
    static get setWrapper() {
      return (this.prototype as Routable).setWrapper;
    }

    /**
     * Sets a wrapper for a routable component class or instances.
     *
     * Typically, instead of using this method, you would rather use the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorator.
     *
     * @param name The name of the wrapper.
     * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
     * @param [options] An optional object specifying the options to pass to the `Wrapper`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the wrapper is created.
     *
     * @returns The [Wrapper](https://layrjs.com/docs/v2/reference/wrapper) instance that was created.
     *
     * @example
     * ```
     * Article.setWrapper('Layout', '/articles');
     *
     * Article.prototype.setWrapper('View', '[/articles]/:id');
     * ```
     *
     * @category Wrappers
     */
    setWrapper(name: string, pattern: Pattern, options: WrapperOptions = {}) {
      const wrapper = new Wrapper(name, pattern, options);

      const wrappers = this.__getWrappers(true);

      wrappers.set(name, wrapper);

      return wrapper;
    }

    static get __callWrapper() {
      return (this.prototype as Routable).__callWrapper;
    }

    __callWrapper(
      rootComponent: typeof Component,
      wrapper: Wrapper,
      identifiers: any,
      wrapperPath: string | undefined,
      children: () => any,
      request: any
    ): any {
      const name = wrapper.getName();

      debug('Calling wrapper %s()', this.describeComponentProperty(name));

      const component = instantiateComponent(this, identifiers);

      const method = wrapper.transformMethod((component as any)[name], request);

      const navigator = this.findNavigator();

      if (wrapperPath !== undefined) {
        return callWrapperByPath(
          rootComponent,
          wrapperPath,
          function () {
            if (navigator !== undefined) {
              return navigator.callAddressableMethodWrapper(component, method, {children});
            } else {
              return method.call(component, {children});
            }
          },
          request
        );
      } else {
        if (navigator !== undefined) {
          return navigator.callAddressableMethodWrapper(component, method, {children});
        } else {
          return method.call(component, {children});
        }
      }
    }

    /**
     * Finds the first wrapper that matches the specified path.
     *
     * @param path A string representing a path.
     *
     * @returns When a wrapper is found, returns an object of the shape `{wrapper, identifiers}` where `wrapper` is the [wrapper](https://layrjs.com/docs/v2/reference/wrapper) that was found and `identifiers` is a plain object containing the value of some [component identifier attributes](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type). If no wrappers were found, returns `undefined`.
     *
     * @example
     * ```
     * const result = Article.prototype.findWrapperByPath('/articles/abc123');
     *
     * result.wrapper; // => A wrapper instance
     * result.identifiers; // => {id: 'abc123'}
     * ```
     *
     * @category Wrappers
     */
    static get findWrapperByPath() {
      return (this.prototype as Routable).findWrapperByPath;
    }

    /**
     * Finds the first wrapper that matches the specified path.
     *
     * @param path A string representing a path.
     *
     * @returns When a wrapper is found, returns an object of the shape `{wrapper, identifiers}` where `wrapper` is the [wrapper](https://layrjs.com/docs/v2/reference/wrapper) that was found and `identifiers` is a plain object containing the value of some [component identifier attributes](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type). If no wrappers were found, returns `undefined`.
     *
     * @example
     * ```
     * const result = Article.prototype.findWrapperByPath('/articles/abc123');
     *
     * result.wrapper; // => A wrapper instance
     * result.identifiers; // => {id: 'abc123'}
     * ```
     *
     * @category Wrappers
     */
    findWrapperByPath(path: string, request?: any) {
      const wrappers = this.__getWrappers();

      for (const wrapper of wrappers.values()) {
        const result = wrapper.matchPath(path, request);

        if (result !== undefined) {
          return {wrapper, ...result};
        }
      }

      return undefined;
    }

    static __wrappers?: Map<string, Wrapper>;

    __wrappers?: Map<string, Wrapper>;

    static get __getWrappers() {
      return (this.prototype as Routable).__getWrappers;
    }

    __getWrappers(autoFork = false) {
      if (this.__wrappers === undefined) {
        Object.defineProperty(this, '__wrappers', {value: new Map()});
      } else if (autoFork && !hasOwnProperty(this, '__wrappers')) {
        Object.defineProperty(this, '__wrappers', {value: new Map(this.__wrappers)});
      }

      return this.__wrappers!;
    }

    // === Observability ===

    /**
     * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.
     *
     * @category Observability
     */

    // === Utilities ===

    static isRoutable(value: any): value is RoutableComponent {
      return isRoutableInstance(value);
    }
  }

  return Routable;
}

export class RoutableComponent extends Routable(Component) {}

// === Multi-components functions ===

export function findRouteByURL(rootComponent: typeof Component, url: URL | string, request?: any) {
  assertIsComponentClass(rootComponent);

  const normalizedURL = normalizeURL(url);

  let result:
    | ({
        routable: typeof RoutableComponent | RoutableComponent;
      } & ReturnType<RoutableComponent['findRouteByURL']>)
    | undefined;

  for (const component of rootComponent.traverseComponents()) {
    if (!isRoutableClass(component)) {
      continue;
    }

    let routable: typeof RoutableComponent | RoutableComponent = component;

    let routableResult = routable.findRouteByURL(normalizedURL, request);

    if (routableResult !== undefined) {
      result = {routable, ...routableResult};

      if (!result!.route.isCatchAll()) {
        break;
      }
    }

    routable = component.prototype;

    routableResult = routable.findRouteByURL(normalizedURL, request);

    if (routableResult !== undefined) {
      result = {routable, ...routableResult};

      if (!result!.route.isCatchAll()) {
        break;
      }
    }
  }

  return result;
}

export function callRouteByURL(rootComponent: typeof Component, url: URL | string, request?: any) {
  const result = findRouteByURL(rootComponent, url, request);

  if (result === undefined) {
    throw new Error(`Couldn't find a route matching the specified URL (URL: '${url}')`);
  }

  const {routable, route, identifiers, params, wrapperPath} = result;

  return routable.__callRoute(rootComponent, route, identifiers, params, wrapperPath, request);
}

export function findWrapperByPath(rootComponent: typeof Component, path: string, request?: any) {
  assertIsComponentClass(rootComponent);

  for (const component of rootComponent.traverseComponents()) {
    if (!isRoutableClass(component)) {
      continue;
    }

    let routable: typeof RoutableComponent | RoutableComponent = component;

    let result = routable.findWrapperByPath(path, request);

    if (result !== undefined) {
      return {routable, ...result};
    }

    routable = component.prototype;

    result = routable.findWrapperByPath(path, request);

    if (result !== undefined) {
      return {routable, ...result};
    }
  }

  return undefined;
}

export function callWrapperByPath(
  rootComponent: typeof Component,
  path: string,
  children: () => any,
  request?: any
) {
  const result = findWrapperByPath(rootComponent, path, request);

  if (result === undefined) {
    throw new Error(`Couldn't find a wrapper matching the specified path (path: '${path}')`);
  }

  const {routable, wrapper, identifiers, wrapperPath} = result;

  return routable.__callWrapper(
    rootComponent,
    wrapper,
    identifiers,
    wrapperPath,
    children,
    request
  );
}

function instantiateComponent(
  componentClassOrPrototype: typeof Component | Component,
  identifiers: any
) {
  if (isComponentClass(componentClassOrPrototype)) {
    return componentClassOrPrototype;
  }

  const componentClass = componentClassOrPrototype.constructor;

  let componentIdentifier: any;
  let referencedComponentIdentifiers: any = {};

  for (const [name, value] of Object.entries(identifiers)) {
    if (typeof value === 'string' || typeof value === 'number') {
      if (componentIdentifier !== undefined) {
        throw new Error(
          `Cannot get or instantiate a component with more than one identifier (\`${JSON.stringify(
            componentIdentifier
          )}\` and \`${JSON.stringify({[name]: value})}\`)`
        );
      }

      componentIdentifier = {[name]: value};
    } else if (typeof value === 'object' && value !== null) {
      referencedComponentIdentifiers[name] = value;
    } else {
      throw new Error(
        `Unexpected identifier type encountered while getting or instantiating a component (type: '${getTypeOf(
          value
        )}')`
      );
    }
  }

  if (componentIdentifier === undefined) {
    throw new Error(`Cannot get or instantiate a component with no specified identifier`);
  }

  const component = componentClass.instantiate(componentIdentifier, {source: 'server'});

  for (const [name, identifiers] of Object.entries(referencedComponentIdentifiers)) {
    const attribute = component.getAttribute(name);
    const valueType = attribute.getValueType();

    if (!isComponentValueTypeInstance(valueType)) {
      throw new Error(
        `Unexpected attribute type encountered while getting or instantiating a component (name: '${name}', type: '${valueType.toString()}')`
      );
    }

    const referencedComponentClassOrPrototype = valueType.getComponent(attribute);

    attribute.setValue(instantiateComponent(referencedComponentClassOrPrototype, identifiers), {
      source: 'server'
    });
  }

  return component;
}
