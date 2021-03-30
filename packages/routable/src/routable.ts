import {Component, isComponentClass} from '@layr/component';
import {Router, normalizeURL} from '@layr/router';
import {hasOwnProperty, getTypeOf, Constructor} from 'core-helpers';
import debugModule from 'debug';

import {Route, RouteOptions, RoutePattern} from './route';
import {isRoutableInstance} from './utilities';

const debug = debugModule('layr:routable');
// To display the debug log, set this environment:
// DEBUG=layr:routable DEBUG_DEPTH=10

/**
 * Extends a [`Component`](https://layrjs.com/docs/v1/reference/component) class with some routing capabilities.
 *
 * #### Usage
 *
 * Call `Routable()` with a [`Component`](https://layrjs.com/docs/v1/reference/component) class to construct a [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) class. Then, you can define some routes into this class by using the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.
 *
 * **Example:**
 *
 * ```
 * // JS
 *
 * import {Component} from '@layr/component';
 * import {Routable, route} from '@layr/routable';
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
 * import {Component} from '@layr/component';
 * import {Routable, route} from '@layr/routable';
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
 * For example, to call the `upvote()` method by a URL, you can use the [`callRouteByURL()`](https://layrjs.com/docs/v1/reference/routable#call-route-by-url-class-method) method:
 *
 * ```
 * await Article.callRouteByURL('/articles/abc123/upvote');
 *
 * // Which is the equivalent of calling the `upvote()` method directly:
 * await Article.upvote({id: 'abc123'});
 * ```
 *
 * A routable component can be registered into a router such as [BrowserRouter](https://layrjs.com/docs/v1/reference/browser-router) by using the [`registerRoutable()`](https://layrjs.com/docs/v1/reference/router#register-routable-instance-method) method (or [`registerRootComponent()`](https://layrjs.com/docs/v1/reference/router#register-root-component-instance-method) to register several components at once):
 *
 * ```
 * import {BrowserRouter} from '@layr/browser-router';
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
 * See the ["Bringing Some Routes"](https://layrjs.com/docs/v1/introduction/routing) guide for a comprehensive example using the `Routable()` mixin.
 *
 * ### RoutableComponent <badge type="primary">class</badge> {#routable-component-class}
 *
 * *Inherits from [`Component`](https://layrjs.com/docs/v1/reference/component).*
 *
 * A `RoutableComponent` class is constructed by calling the `Routable()` mixin ([see above](https://layrjs.com/docs/v1/reference/routable#routable-mixin)).
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
     * See the methods that are inherited from the [`Component`](https://layrjs.com/docs/v1/reference/component#creation) class.
     *
     * @category Component Methods
     */

    // === Router registration ===

    static __router: Router | undefined;

    /**
     * Returns the router in which the routable component is registered. If the routable component is not registered in a router, an error is thrown.
     *
     * @returns A [`Router`](https://layrjs.com/docs/v1/reference/router) instance.
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
     * @returns A [`Router`](https://layrjs.com/docs/v1/reference/router) instance.
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
     * Gets a route. If there is no route with the specified name, an error is thrown.
     *
     * @param name The name of the route to get.
     *
     * @returns A [Route](https://layrjs.com/docs/v1/reference/route) instance.
     *
     * @example
     * ```
     * Article.getRoute('upvote'); => upvote() route
     * ```
     *
     * @category Routes
     */
    static get getRoute() {
      return this.prototype.getRoute;
    }

    /**
     * Gets a route. If there is no route with the specified name, an error is thrown.
     *
     * @param name The name of the route to get.
     *
     * @returns A [Route](https://layrjs.com/docs/v1/reference/route) instance.
     *
     * @example
     * ```
     * Article.getRoute('upvote'); => upvote() route
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
     * Article.hasRoute('upvote'); // => true
     * ```
     *
     * @category Routes
     */
    static get hasRoute() {
      return this.prototype.hasRoute;
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
    hasRoute(name: string) {
      return this.__getRoute(name) !== undefined;
    }

    static get __getRoute() {
      return this.prototype.__getRoute;
    }

    __getRoute(name: string) {
      const routes = this.__getRoutes();

      return routes.get(name);
    }

    /**
     * Sets a route in the storable component.
     *
     * Typically, instead of using this method, you would rather use the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.
     *
     * @param name The name of the route.
     * @param pattern A string specifying the [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) associated with the route.
     * @param [options] An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v1/reference/route#constructor) when the route is created.
     *
     * @returns The [Route](https://layrjs.com/docs/v1/reference/route) instance that was created.
     *
     * @example
     * ```
     * Article.setRoute('upvote', '/articles/:id/upvote');
     * ```
     *
     * @category Routes
     */
    static get setRoute() {
      return this.prototype.setRoute;
    }

    /**
     * Sets a route in the storable component.
     *
     * Typically, instead of using this method, you would rather use the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.
     *
     * @param name The name of the route.
     * @param pattern A string specifying the [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) associated with the route.
     * @param [options] An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v1/reference/route#constructor) when the route is created.
     *
     * @returns The [Route](https://layrjs.com/docs/v1/reference/route) instance that was created.
     *
     * @example
     * ```
     * Article.setRoute('upvote', '/articles/:id/upvote');
     * ```
     *
     * @category Routes
     */
    setRoute(name: string, pattern: RoutePattern, options: RouteOptions = {}) {
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
    static get callRoute() {
      return this.prototype.callRoute;
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
    callRoute(name: string, params?: any) {
      const route = this.getRoute(name);

      return this.__callRoute(route, params);
    }

    static get __callRoute() {
      return this.prototype.__callRoute;
    }

    __callRoute(route: Route, params: any) {
      const name = route.getName();

      debug('Calling %s(%o)', this.describeComponentProperty(name), params);

      let component: any;

      if (isComponentClass(this)) {
        component = this;
      } else {
        component =
          this.constructor.getIdentityMap().getComponent(params) ??
          this.constructor.create(params, {isNew: false});
      }

      return component[name](params);
    }

    /**
     * Finds the first route that matches the specified URL.
     *
     * If no route matches the specified URL, returns `undefined`.
     *
     * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
     *
     * @returns An object of the shape `{route, params}` (or `undefined` if no route was found) where `route` is the [route](https://layrjs.com/docs/v1/reference/route) that was found, and `params` is a plain object representing the parameters that are included in the specified URL.
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
    static get findRouteByURL() {
      return this.prototype.findRouteByURL;
    }

    /**
     * Finds the first route that matches the specified URL.
     *
     * If no route matches the specified URL, returns `undefined`.
     *
     * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
     *
     * @returns An object of the shape `{route, params}` (or `undefined` if no route was found) where `route` is the [route](https://layrjs.com/docs/v1/reference/route) that was found, and `params` is a plain object representing the parameters that are included in the specified URL.
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
    findRouteByURL(url: URL | string) {
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
    static get callRouteByURL() {
      return this.prototype.callRouteByURL;
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
    callRouteByURL(url: URL | string) {
      const result = this.findRouteByURL(url);

      if (result === undefined) {
        throw new Error(
          `Couldn't find a route matching the specified URL (${this.describeComponent()}, URL: '${url}')`
        );
      }

      const {route, params} = result;

      return this.__callRoute(route, params);
    }

    static __routes?: Map<string, Route>;

    __routes?: Map<string, Route>;

    static get __getRoutes() {
      return this.prototype.__getRoutes;
    }

    __getRoutes(autoFork = false) {
      if (this.__routes === undefined) {
        Object.defineProperty(this, '__routes', {value: new Map()});
      } else if (autoFork && !hasOwnProperty(this, '__routes')) {
        Object.defineProperty(this, '__routes', {value: new Map(this.__routes)});
      }

      return this.__routes!;
    }

    // === Observability ===

    /**
     * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.
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
