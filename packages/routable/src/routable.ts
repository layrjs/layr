import {Component, isComponentClass} from '@liaison/component';
import {Router, normalizeURL} from '@liaison/router';
import {hasOwnProperty, getTypeOf, Constructor} from 'core-helpers';
import debugModule from 'debug';

import {Route, RouteOptions, RoutePattern} from './route';
import {isRoutableInstance} from './utilities';

const debug = debugModule('liaison:routable');
// To display the debug log, set this environment:
// DEBUG=liaison:routable DEBUG_DEPTH=10

/**
 * Extends a [`Component`](https://liaison.dev/docs/v1/reference/component) class with some routing capabilities.
 *
 * #### Usage
 *
 * Call `Routable()` with a [`Component`](https://liaison.dev/docs/v1/reference/component) class to construct a [`RoutableComponent`](https://liaison.dev/docs/v1/reference/routable#routable-component-class) class. Then, you can define some routes into this class by using the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component} from '@liaison/component';
 * import {Routable, route} from '@liaison/routable';
 *
 * class Article extends Routable(Component) {
 *   ﹫route('/articles/:id/upvote') static upvote({id}) {
 *     // ...
 *   }
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '@liaison/component';
 * import {Routable, route} from '@liaison/routable';
 *
 * class Article extends Routable(Component) {
 *   ﹫route('/articles/:id/upvote') static upvote({id}: {id: string}) {
 *     // ...
 *   }
 * }
 * ```
 *
 * Once you have a routable component, you can use any method provided by the `Routable()` mixin.
 *
 * For example, to call the `upvote()` method by an URL, you can use the [`callRouteByURL()`](https://liaison.dev/docs/v1/reference/routable#call-route-by-url-static-method) method:
 *
 * ```
 * await Article.callRouteByURL('/articles/abc123/upvote');
 *
 * // Which is the equivalent of calling the `upvote()` method directly:
 * await Article.upvote({id: 'abc123'});
 * ```
 *
 * A routable component can be registered into a router such as [BrowserRouter](https://liaison.dev/docs/v1/reference/browser-router) by using the [`registerRoutable()`](https://liaison.dev/docs/v1/reference/router#register-routable-instance-method) method (or [`registerRootComponent()`](https://liaison.dev/docs/v1/reference/router#register-root-component-instance-method) to register several components at once):
 *
 * ```
 * import {BrowserRouter} from '@liaison/browser-router';
 *
 * const router = new BrowserRouter();
 *
 * router.registerRoutable(Article);
 * ```
 *
 * Once a routable component is registered into a router you can control it through its router:
 *
 * ```
 * await router.callRouteByURL('/articles/abc123/upvote');
 * ```
 *
 * See the ["Bringing Some Routes"](https://liaison.dev/docs/v1/introduction/routing) guide for a comprehensive example using the `Routable()` mixin.
 *
 * ### RoutableComponent <badge type="primary">class</badge> {#routable-component-class}
 *
 * *Inherits from [`Component`](https://liaison.dev/docs/v1/reference/component).*
 *
 * A `RoutableComponent` class is constructed by calling the `Routable()` mixin ([see above](https://liaison.dev/docs/v1/reference/routable#routable-mixin)).
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
     * See the methods that are inherited from the [`Component`](https://liaison.dev/docs/v1/reference/component#creation) class.
     *
     * @category Component Methods
     */

    // === Router registration ===

    static __router: Router | undefined;

    /**
     * Returns the router in which the routable component is registered. If the routable component is not registered in a router, an error is thrown.
     *
     * @returns A [`Router`](https://liaison.dev/docs/v1/reference/router) instance.
     *
     * @example
     * ```
     * Article.getRouter(); // => router
     * ```
     *
     * @category Router Registration
     */
    static getRouter() {
      const router = this.__router;

      if (router === undefined) {
        throw new Error(
          `Cannot get the router of a component that is not registered in any router (${this.describeComponent()})`
        );
      }

      return router;
    }

    /**
     * Returns the router in which the routable component is registered. If the routable component is not registered in a router, an error is thrown.
     *
     * @returns A [`Router`](https://liaison.dev/docs/v1/reference/router) instance.
     *
     * @example
     * ```
     * Article.getRouter(); // => router
     * ```
     *
     * @category Router Registration
     */
    getRouter() {
      return (this.constructor as typeof RoutableComponent).getRouter();
    }

    /**
     * Returns whether the routable component is registered in a router.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasRouter(); // => true
     * ```
     *
     * @category Router Registration
     */
    static hasRouter() {
      return this.__router !== undefined;
    }

    /**
     * Returns whether the routable component is registered in a router.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Article.hasRouter(); // => true
     * ```
     *
     * @category Router Registration
     */
    hasRouter() {
      return (this.constructor as typeof RoutableComponent).hasRouter();
    }

    static __setRouter(router: Router) {
      Object.defineProperty(this, '__router', {value: router});
    }

    // === Routes ===

    /**
     * Gets the route that has the specified name. If there is no route with the specified name, an error is thrown.
     *
     * @param name The name of the route to get.
     *
     * @returns A [Route](https://liaison.dev/docs/v1/reference/route) instance.
     *
     * @example
     * ```
     * Article.getRoute('upvote'); => upvote() route
     * ```
     *
     * @category Routes
     */
    static getRoute(name: string) {
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
     * Article.hasRoute('upvote'); // => true
     * ```
     *
     * @category Routes
     */
    static hasRoute(name: string) {
      return this.__getRoute(name) !== undefined;
    }

    static __getRoute(name: string) {
      const routes = this.__getRoutes();

      return routes.get(name);
    }

    /**
     * Sets a route in the storable component.
     *
     * @param name The name of the route.
     * @param pattern A string specifying the URL pattern associated with the route.
     * @param [options] An object specifying the options to pass to the `Route`'s [constructor](https://liaison.dev/docs/v1/reference/route#constructor) when the route is created.
     *
     * @returns The [Route](https://liaison.dev/docs/v1/reference/route) instance that was created.
     *
     * @example
     * ```
     * Article.setRoute('upvote', '/articles/:id/upvote');
     * ```
     *
     * @category Routes
     */
    static setRoute(name: string, pattern: RoutePattern, options: RouteOptions = {}) {
      const route = new Route(name, pattern, options);

      const routes = this.__getRoutes(true);

      routes.set(name, route);

      return route;
    }

    /**
     * Calls the method associated to a route that has the specified name. If there is no route with the specified name, an error is thrown.
     *
     * @param name The name of the route for which the associated method should be called.
     * @param [params] The parameters to pass when the method is called.
     *
     * @returns The result of the called method.
     *
     * @example
     * ```
     * await Article.callRoute('upvote', {id: 'abc123'});
     *
     * // Which is the equivalent of calling the `upvote()` method directly:
     * await Article.upvote({id: 'abc123'});
     * ```
     *
     * @category Routes
     */
    static callRoute(name: string, params?: any) {
      const route = this.getRoute(name);

      return this.__callRoute(route, params);
    }

    static __callRoute(route: Route, params: any) {
      const name = route.getName();

      debug('Calling %s.%s(%o)', this.getComponentName(), name, params);

      return (this as any)[name](params);
    }

    /**
     * Finds the first route that matches the specified URL.
     *
     * If no route matches the specified URL, returns `undefined`.
     *
     * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
     *
     * @returns An object of the shape `{route, params}` (or `undefined` if no route was found) where `route` is the [route](https://liaison.dev/docs/v1/reference/route) that was found, and `params` is a plain object representing the parameters that are included in the specified URL.
     *
     * @example
     * ```
     * const {route, params} = Article.findRouteByURL('/articles/abc123/upvote');
     *
     * route; // => upvote() route
     * params; // => {id: 'abc123'}
     * ```
     *
     * @category Routes
     */
    static findRouteByURL(url: URL | string) {
      const normalizedURL = normalizeURL(url);

      const routes = this.__getRoutes();

      for (const route of routes.values()) {
        const result = route.matchURL(normalizedURL);

        if (result !== undefined) {
          return {route, params: result};
        }
      }

      return undefined;
    }

    /**
     * Calls the method associated to the first route that matches the specified URL.
     *
     * If no route matches the specified URL, an error is thrown.
     *
     * When a route is found, the associated method is called with the parameters that are included in the specified URL.
     *
     * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
     *
     * @returns The result of the method associated to the route that was found.
     *
     * @example
     * ```
     * await Article.callRouteByURL('/articles/abc123/upvote');
     *
     * // Which is the equivalent of calling the `upvote()` method directly:
     * await Article.upvote({id: 'abc123'});
     * ```
     *
     * @category Routes
     */
    static callRouteByURL(url: URL | string) {
      const result = this.findRouteByURL(url);

      if (result === undefined) {
        throw new Error(
          `Couldn't find a route matching the specified URL (${this.describeComponent()}, URL: '${url}')`
        );
      }

      const {route, params} = result;

      return this.__callRoute(route, params);
    }

    static __routes: Map<string, Route>;

    static __getRoutes(autoFork = false) {
      if (this.__routes === undefined) {
        Object.defineProperty(this, '__routes', {value: new Map()});
      } else if (autoFork && !hasOwnProperty(this, '__routes')) {
        Object.defineProperty(this, '__routes', {value: new Map(this.__routes)});
      }

      return this.__routes;
    }

    // === Observability ===

    /**
     * See the methods that are inherited from the [`Observable`](https://liaison.dev/docs/v1/reference/observable#observable-class) class.
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
