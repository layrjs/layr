import {AbstractRouter, normalizeURL} from '@liaison/abstract-router';

import type {RoutableComponent} from './routable';
import type {RouteOptions, RoutePattern} from './route';
import {isRoutableClass} from './utilities';

export function route(pattern: RoutePattern, options: RouteOptions = {}) {
  return function (target: typeof RoutableComponent, name: string, descriptor: PropertyDescriptor) {
    const {value: method, get: originalGet, configurable, enumerable} = descriptor;

    if (
      !(
        isRoutableClass(target) &&
        (typeof method === 'function' || originalGet !== undefined) &&
        enumerable === false
      )
    ) {
      throw new Error(
        `@route() should be used to decorate a routable component static method (property: '${name}')`
      );
    }

    const route = target.setRoute(name, pattern, options);

    const decorate = function (this: typeof RoutableComponent, method: Function) {
      defineMethod(method, 'matchURL', function (url: string | URL) {
        return route.matchURL(url);
      });

      defineMethod(method, 'generateURL', function (params?: any) {
        return route.generateURL(params);
      });

      Object.defineProperty(method, '__isDecorated', {value: true});
    };

    const decorateWithRouter = function (
      this: typeof RoutableComponent,
      method: Function,
      router: AbstractRouter
    ) {
      defineMethod(method, 'navigate', function (this: Function, params?: any) {
        return router.navigate(this.generateURL(params));
      });

      defineMethod(method, 'redirect', function (this: Function, params?: any) {
        return router.redirect(this.generateURL(params));
      });

      defineMethod(method, 'reload', function (this: Function, params?: any) {
        router.reload(this.generateURL(params));
      });

      defineMethod(method, 'isActive', function (this: Function, params?: any) {
        return normalizeURL(router.getCurrentURL()).pathname === this.generateURL(params);
      });

      router.applyCustomRouteDecorators(this, method);

      Object.defineProperty(method, '__isDecoratedWithRouter', {value: true});
    };

    const defineMethod = function (object: any, name: string, func: Function) {
      Object.defineProperty(object, name, {
        value: func,
        writable: true,
        enumerable: false,
        configurable: true
      });
    };

    const get = function (this: typeof RoutableComponent) {
      const actualMethod = originalGet !== undefined ? originalGet.call(this) : method;

      if (typeof actualMethod !== 'function') {
        throw new Error(`@route() can only be used on methods`);
      }

      if (actualMethod.__isDecorated === undefined) {
        decorate.call(this, actualMethod);
      }

      if (actualMethod.__isDecoratedWithRouter === undefined) {
        if (this.hasRouter()) {
          decorateWithRouter.call(this, actualMethod, this.getRouter());
        }
      }

      return actualMethod;
    };

    return {get, configurable, enumerable};
  };
}
