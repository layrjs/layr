import {Addressable, AddressableOptions} from './addressable';

export type RouteOptions = AddressableOptions;

/**
 * *Inherits from [`Addressable`](https://layrjs.com/docs/v2/reference/addressable).*
 *
 * Represents a route in a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
 *
 * #### Usage
 *
 * Typically, you create a `Route` and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.
 *
 * See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
 */
export class Route extends Addressable {
  // === Creation ===

  /**
   * See the constructor that is inherited from the [`Addressable`](https://layrjs.com/docs/v2/reference/addressable#constructor) class.
   *
   * @category Creation
   */

  // === Methods ===

  /**
   * See the methods that are inherited from the [`Addressable`](https://layrjs.com/docs/v2/reference/addressable#basic-methods) class.
   *
   * @category Methods
   */

  // === Types ===

  /**
   * See the types that are related to the [`Addressable`](https://layrjs.com/docs/v2/reference/addressable#types) class.
   *
   * @category Types
   */

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
