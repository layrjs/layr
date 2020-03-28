import ow from 'ow';

import {isRoutableClass} from './utilities';

export function route(pattern, options = {}) {
  ow(pattern, 'pattern', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    const {value: method, get: originalGet, configurable, enumerable} = descriptor;

    if (!isRoutableClass(target)) {
      throw new Error(`@route() can only be used on routable component static methods`);
    }

    const route = target.setRoute(name, pattern, options);

    const decorate = function(method) {
      method.matchURL = function(url) {
        return route.matchURL(url);
      };

      method.generateURL = function(params) {
        const url = route.generateURL(params);

        return url;
      };

      Object.defineProperty(method, '__isDecorated', {value: true});
    };

    const decorateWithRouter = function(method, router) {
      method.navigate = function(params, options) {
        const url = this.generateURL(params);

        router.navigate(url, options);
      };

      method.redirect = function(params) {
        const url = this.generateURL(params);

        router.redirect(url);
      };

      method.reload = function(params, options) {
        const url = this.generateURL(params);

        router.reload(url, options);
      };

      method.isActive = function(params) {
        const url = this.generateURL(params);

        return router.getCurrentLocation().pathname === url;
      };

      router.applyCustomRouteDecorators(this, method);

      Object.defineProperty(method, '__isDecoratedWithRouter', {value: true});
    };

    const get = function() {
      const actualMethod = originalGet !== undefined ? originalGet.call(this) : method;

      if (typeof actualMethod !== 'function') {
        throw new Error(`@route() can only be used on methods`);
      }

      if (actualMethod.__isDecorated === undefined) {
        decorate.call(this, actualMethod);
      }

      if (actualMethod.__isDecoratedWithRouter === undefined) {
        const router = this.getRouter({throwIfMissing: false});

        if (router !== undefined) {
          decorateWithRouter.call(this, actualMethod, router);
        }
      }

      return actualMethod;
    };

    return {get, configurable, enumerable};
  };
}
