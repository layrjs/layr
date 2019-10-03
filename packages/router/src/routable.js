import {hasOwnProperty} from '@liaison/util';

import {Route} from './route';

export const Routable = (Base = Object) =>
  class Routable extends Base {
    static $getRoute(name) {
      const routes = this.$getRoutes();
      return routes.get(name);
    }

    static $setRoute(name, pattern, options) {
      const routes = this.$getRoutes();
      const route = new Route(name, pattern, options);
      routes.set(name, route);
      return route;
    }

    static $getRoutes() {
      let routes = this.__routes;
      if (!hasOwnProperty(this, '__routes')) {
        routes = new Map(routes);
        Object.defineProperty(this, '__routes', {value: routes});
      }
      return routes;
    }

    static $findRoute(url) {
      const routes = this.$getRoutes();
      for (const route of routes.values()) {
        const result = route.test(url);
        if (result) {
          return {route, params: result};
        }
      }
    }

    static $callRoute(url) {
      const result = this.$findRoute(url);
      if (!result) {
        throw new Error(`Route not found (URL: '${url}')`);
      }
      return this[result.route.name](result.params);
    }

    static __isRoutable = true;

    $getRoute(name) {
      return this.constructor.$getRoute.call(this, name);
    }

    $setRoute(name, pattern, options) {
      return this.constructor.$setRoute.call(this, name, pattern, options);
    }

    $getRoutes() {
      return this.constructor.$getRoutes.call(this);
    }

    $findRoute(url) {
      return this.constructor.$findRoute.call(this, url);
    }

    $callRoute(url) {
      return this.constructor.$callRoute.call(this, url);
    }
  };

export function isRoutable(object) {
  return (
    object !== undefined &&
    object !== null &&
    (object.__isRoutable === true || object.constructor?.__isRoutable === true)
  );
}
