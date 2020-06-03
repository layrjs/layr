import {Component, isComponentClass} from '@liaison/component';
import {AbstractRouter, normalizeURL} from '@liaison/abstract-router';
import {hasOwnProperty, getTypeOf, Constructor} from 'core-helpers';
import debugModule from 'debug';

import {Route, RouteOptions, RoutePattern} from './route';
import {isRoutableInstance} from './utilities';

const debug = debugModule('liaison:routable');
// To display the debug log, set this environment:
// DEBUG=liaison:routable DEBUG_DEPTH=10

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
    // === Router registration ===

    static __router: AbstractRouter | undefined;

    static getRouter() {
      const router = this.__router;

      if (router === undefined) {
        throw new Error(
          `Cannot get the router of a component that is not registered in any router (${this.describeComponent()})`
        );
      }

      return router;
    }

    getRouter() {
      return (this.constructor as typeof RoutableComponent).getRouter();
    }

    static hasRouter() {
      return this.__router !== undefined;
    }

    hasRouter() {
      return (this.constructor as typeof RoutableComponent).hasRouter();
    }

    static __setRouter(router: AbstractRouter) {
      Object.defineProperty(this, '__router', {value: router});
    }

    // === Routes ===

    static getRoute(name: string) {
      const route = this.__getRoute(name);

      if (route === undefined) {
        throw new Error(`The route '${name}' is missing (${this.describeComponent()})`);
      }

      return route;
    }

    static hasRoute(name: string) {
      return this.__getRoute(name) !== undefined;
    }

    static __getRoute(name: string) {
      const routes = this.__getRoutes();

      return routes.get(name);
    }

    static setRoute(name: string, pattern: RoutePattern, options: RouteOptions = {}) {
      const route = new Route(name, pattern, options);

      const routes = this.__getRoutes(true);

      routes.set(name, route);

      return route;
    }

    static callRoute(name: string, params?: any) {
      const route = this.getRoute(name);

      return this.__callRoute(route, params);
    }

    static __callRoute(route: Route, params: any) {
      const name = route.getName();

      debug('Calling %s.%s(%o)', this.getComponentName(), name, params);

      return (this as any)[name](params);
    }

    static findRouteForURL(url: string | URL) {
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

    static callRouteForURL(url: string | URL) {
      const result = this.findRouteForURL(url);

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

    // === Utilities ===

    static isRoutable(value: any): value is RoutableComponent {
      return isRoutableInstance(value);
    }
  }

  return Routable;
}

export class RoutableComponent extends Routable(Component) {}
