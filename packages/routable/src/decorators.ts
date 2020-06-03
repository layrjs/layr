import type {RoutableComponent} from './routable';
import type {RouteOptions, RoutePattern} from './route';
import {isRoutableClass} from './utilities';

export function route(pattern: RoutePattern, options: RouteOptions = {}) {
  return function (target: typeof RoutableComponent, name: string, descriptor: PropertyDescriptor) {
    if (
      !(
        isRoutableClass(target) &&
        typeof descriptor.value === 'function' &&
        descriptor.enumerable === false
      )
    ) {
      throw new Error(
        `@route() should be used to decorate a routable component static method (property: '${name}')`
      );
    }

    target.setRoute(name, pattern, options);
  };
}
