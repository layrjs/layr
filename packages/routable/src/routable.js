import {hasOwnProperty, getTypeOf} from 'core-helpers';
import debugModule from 'debug';
import ow from 'ow';

import {Route} from './route';
import {isRoutableClass, isRoutable, normalizeURL} from './utilities';

const debug = debugModule('liaison:routable');
// To display the debug log, set this environment:
// DEBUG=liaison:routable DEBUG_DEPTH=10

export const Routable = (Base = Object) => {
  if (isRoutableClass(Base)) {
    return Base;
  }

  if (typeof Base?.isComponent !== 'function') {
    throw new Error(
      `The Routable mixin can only be applied on component classes (received type: '${getTypeOf(
        Base
      )}')`
    );
  }

  class Routable extends Base {
    // === Router registration ===

    static getRouter(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const router = this.__router;

      if (router !== undefined) {
        return router;
      }

      if (throwIfMissing) {
        throw new Error(
          `Cannot get the router of ${this.describeComponentType()} that is not registered in any router (${this.describeComponent()})`
        );
      }
    }

    static hasRouter() {
      return this.__router !== undefined;
    }

    static __setRouter(router) {
      Object.defineProperty(this, '__router', {value: router});
    }

    // === Routes ===

    static getRoute(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const routes = this.__getRoutes(false);

      const route = routes.get(name);

      if (route !== undefined) {
        return route;
      }

      if (throwIfMissing) {
        throw new Error(`The route '${name}' is missing (${this.describeComponent()})`);
      }
    }

    static setRoute(name, pattern, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(pattern, 'pattern', ow.string.nonEmpty);
      ow(options, 'options', ow.object);

      const route = new Route(name, pattern, options);

      const routes = this.__getRoutes(true);

      routes.set(name, route);

      return route;
    }

    static callRoute(name, params, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(params, 'params', ow.optional.object);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const route = this.getRoute(name, {throwIfMissing});

      if (route === undefined) {
        return;
      }

      return this.__callRoute(route, params);
    }

    static __callRoute(route, params) {
      const name = route.getName();

      debug('Calling %s.%s(%o)', this.getComponentName(), name, params);

      return this[name](params);
    }

    static findRouteForURL(url) {
      const normalizedURL = normalizeURL(url);

      const routes = this.__getRoutes(false);

      for (const route of routes.values()) {
        const result = route.matchURL(normalizedURL);

        if (result !== undefined) {
          return {route, params: result};
        }
      }
    }

    static callRouteForURL(url, options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const result = this.findRouteForURL(url);

      if (result !== undefined) {
        const {route, params} = result;

        return this.__callRoute(route, params);
      }

      if (throwIfMissing) {
        throw new Error(
          `Cannot find a route matching the specified URL (${this.describeComponent()}, URL: '${url}')`
        );
      }
    }

    static __getRoutes(autoFork) {
      if (this.__routes === undefined) {
        Object.defineProperty(this, '__routes', {value: new Map()});
      } else if (autoFork && !hasOwnProperty(this, '__routes')) {
        Object.defineProperty(this, '__routes', {value: new Map(this.__routes)});
      }

      return this.__routes;
    }

    // === Utilities ===

    static isRoutable(object) {
      return isRoutable(object);
    }
  }

  return Routable;
};
