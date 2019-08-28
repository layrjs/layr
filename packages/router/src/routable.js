import Path from 'path-parser';

export const Routable = (Base = Object) =>
  class Routable extends Base {
    static getRoute(name) {
      const routes = this.getRoutes();
      return routes.get(name);
    }

    static setRoute(name, pattern, options) {
      const routes = this.getRoutes();
      const route = {name, pattern, ...options};
      const _parsedPattern = new Path(pattern);
      Object.defineProperty(route, '_parsedPattern', {value: _parsedPattern});
      routes.set(name, route);
      return route;
    }

    static getRoutes() {
      let routes = this._routes;
      if (!Object.prototype.hasOwnProperty.call(this, '_routes')) {
        routes = new Map(routes);
        Object.defineProperty(this, '_routes', {value: routes});
      }
      return routes;
    }

    static findRoute(url) {
      const {pathname} = new URL(url);

      const routes = this.getRoutes();
      for (const route of routes.values()) {
        const result = route._parsedPattern.test(pathname);
        if (result) {
          return {route, params: result};
        }
      }
    }

    static callRoute(url) {
      const result = this.findRoute(url);
      if (!result) {
        throw new Error(`Route not found (URL: '${url}')`);
      }
      return this[result.route.name](result.params);
    }

    static __isRoutable = true;
  };

// === Decorators ===

export function route(pattern, options) {
  return function (target, name, {value: func, get: getter, configurable, enumerable}) {
    if (typeof target.setRoute !== 'function') {
      throw new Error(`@route() can only be used on routable classes`);
    }

    const route = target.setRoute(name, pattern, options);

    const decorate = function (func) {
      if (typeof func !== 'function') {
        throw new Error(`@route() can only be used on functions`);
      }

      func.getPath = function (params) {
        const parsedPattern = route._parsedPattern;

        // Since 'path-parser' ignore getters, let's call them explicitly
        const actualParams = {};
        for (const name of parsedPattern.params) {
          const value = params[name];
          if (value !== undefined) {
            actualParams[name] = value;
          }
        }

        return parsedPattern.build(actualParams);
      };

      func.navigate = function (params, {replace = false} = {}) {
        const router = target.layer.get('router');
        const path = this.getPath(params);
        router.navigate(path, {replace});
      };
    };

    if (getter) {
      const originalGetter = getter;
      getter = function () {
        const func = originalGetter.call(this);
        decorate(func);
        return func;
      };
    } else {
      decorate(func);
    }

    return {
      ...(func && {value: func}),
      ...(getter && {get: getter}),
      configurable,
      enumerable
    };
  };
}

// === Utilities ===

export function isRoutable(object) {
  return object !== undefined && object !== null && object.__isRoutable === true;
}
