import {isRoutable} from './routable';

export function route(pattern, options) {
  return function (
    target,
    name,
    {value: originalFunction, get: originalGet, configurable, enumerable}
  ) {
    if (!isRoutable(target)) {
      throw new Error(`@route() can only be used on routable classes`);
    }

    const route = target.$setRoute(name, pattern, options);

    const decorate = function (func) {
      if (typeof func !== 'function') {
        throw new Error(`@route() can only be used on functions`);
      }

      const router = this.$getLayer().get('router');

      func.getPath = function (params) {
        return route.build(params);
      };

      func.navigate = function (params, {replace = false} = {}) {
        const path = this.getPath(params);
        router.navigate(path, {replace});
      };

      func.redirect = function (params) {
        const path = this.getPath(params);
        router.redirect(path);
      };

      func.isActive = function (params) {
        const path = this.getPath(params);
        return router.location.pathname === path;
      };

      router.applyCustomRouteDecorators(this, func);
    };

    let hasBeenDecorated = false;

    const get = function () {
      const func = originalGet ? originalGet.call(this) : originalFunction;

      if (!hasBeenDecorated) {
        decorate.call(this, func);
        hasBeenDecorated = true;
      }

      return func;
    };

    return {get, configurable, enumerable};
  };
}
