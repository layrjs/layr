import {Addressable, AddressableOptions} from './addressable';

export type RouteOptions = AddressableOptions;

/**
 * Represents a route in a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
 *
 * A route is composed of:
 *
 * - A name matching a method of the [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class) that contains the route.
 * - The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
 * - Some [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) aliases.
 *
 * #### Usage
 *
 * Typically, you create a `Route` and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.
 *
 * See an example of use in the [`Routable()`](https://layrjs.com/docs/v2/reference/routable#usage) mixin.
 */
export class Route extends Addressable {
  static isRoute(value: any): value is Route {
    return isRouteInstance(value);
  }
}

/**
 * Returns whether the specified value is a [`Route`](https://layrjs.com/docs/v2/reference/route) class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRouteClass(value: any): value is typeof Route {
  return typeof value?.isRoute === 'function';
}

/**
 * Returns whether the specified value is a [`Route`](https://layrjs.com/docs/v2/reference/route) instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRouteInstance(value: any): value is Route {
  return typeof value?.constructor?.isRoute === 'function';
}
