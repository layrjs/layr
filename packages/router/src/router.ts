import {Observable} from '@layr/observable';
import {assertNoUnknownOptions} from 'core-helpers';

import {isRouterInstance, normalizeURL, stringifyURL, parseQuery} from './utilities';

declare global {
  interface Function {
    matchURL: (url: URL | string) => {identifiers: any; params: any} | undefined;
    generateURL: (params?: any, options?: URLOptions) => string;
    generatePath: () => string;
    generateQueryString: (params?: any) => string;
    navigate: (params?: any, options?: URLOptions & NavigationOptions) => Promise<void> | undefined;
    redirect: (params?: any, options?: URLOptions & NavigationOptions) => Promise<void> | undefined;
    reload: (params?: any, options?: URLOptions) => void;
    isActive: () => boolean;
  }
}

export type URLOptions = {hash?: string};

export type NavigationOptions = {silent?: boolean; defer?: boolean};

type RouterPlugin = (router: Router) => void;

type AddressableMethodWrapper = (receiver: any, method: Function, params: any) => any;

type CustomRouteDecorator = (method: Function) => void;

export type RouterOptions = {
  plugins?: RouterPlugin[];
};

/**
 * *Inherits from [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class).*
 *
 * An abstract class from which classes such as [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) or [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router) are constructed. Unless you build a custom router, you probably won't have to use this class directly.
 */
export abstract class Router extends Observable(Object) {
  constructor(options: RouterOptions = {}) {
    super();

    const {plugins, ...otherOptions} = options;

    assertNoUnknownOptions(otherOptions);

    if (plugins !== undefined) {
      this.applyPlugins(plugins);
    }

    this.mount();
  }

  mount() {
    // Override this method to implement custom mount logic
  }

  unmount() {
    // Override this method to implement custom unmount logic
  }

  // === Current Location ===

  /**
   * Returns the current URL of the router.
   *
   * @returns A string.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.navigate('/movies/inception?showDetails=1#actors');
   * router.getCurrentURL(); // => /movies/inception?showDetails=1#actors'
   * ```
   *
   * @category Current Location
   */
  getCurrentURL() {
    return stringifyURL(this._getCurrentURL());
  }

  abstract _getCurrentURL(): URL;

  /**
   * Returns the path of the current URL.
   *
   * @returns A string.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.navigate('/movies/inception?showDetails=1#actors');
   * router.getCurrentPath(); // => '/movies/inception'
   * ```
   *
   * @category Current Location
   */
  getCurrentPath() {
    return this._getCurrentURL().pathname;
  }

  /**
   * Returns an object representing the query of the current URL.
   *
   * The [`qs`](https://github.com/ljharb/qs) package is used under the hood to parse the query.
   *
   * @returns A plain object.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.navigate('/movies/inception?showDetails=1#actors');
   * router.getCurrentQuery(); // => {showDetails: '1'}
   * ```
   *
   * @category Current Location
   */
  getCurrentQuery<T extends object = object>() {
    return parseQuery<T>(this._getCurrentURL().search);
  }

  /**
   * Returns the hash (i.e., the [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) contained in the current URL. If the current URL doesn't contain a hash, returns `undefined`.
   *
   * @returns A string or `undefined`.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.navigate('/movies/inception?showDetails=1#actors');
   * router.getCurrentHash(); // => 'actors'
   *
   * router.navigate('/movies/inception?showDetails=1#actors');
   * router.getCurrentHash(); // => 'actors'
   *
   * router.navigate('/movies/inception?showDetails=1#');
   * router.getCurrentHash(); // => undefined
   *
   * router.navigate('/movies/inception?showDetails=1');
   * router.getCurrentHash(); // => undefined
   * ```
   *
   * @category Current Location
   */
  getCurrentHash() {
    let hash = this._getCurrentURL().hash;

    if (hash.startsWith('#')) {
      hash = hash.slice(1);
    }

    if (hash === '') {
      return undefined;
    }

    return hash;
  }

  // === Navigation ===

  /**
   * Navigates to a URL.
   *
   * The specified URL is added to the router's history.
   *
   * The observers of the router are automatically called.
   *
   * Note that instead of using this method, you can use the handy `navigate()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   * @param [options.silent] A boolean specifying whether the router's observers should *not* be called (default: `false`).
   * @param [options.defer] A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).
   *
   * @example
   * ```
   * router.navigate('/movies/inception');
   *
   * // Same as above, but in a more idiomatic way:
   * Movie.Viewer.navigate({slug: 'inception});
   * ```
   *
   * @category Navigation
   * @possiblyasync
   */
  navigate(url: string | URL, options: NavigationOptions = {}) {
    const {silent = false, defer = false} = options;

    this._navigate(normalizeURL(url));

    if (silent) {
      return;
    }

    return possiblyDeferred(defer, () => {
      this.callObservers();
    });
  }

  abstract _navigate(url: URL): void;

  /**
   * Redirects to a URL.
   *
   * The specified URL replaces the current entry of the router's history.
   *
   * The observers of the router are automatically called.
   *
   * Note that instead of using this method, you can use the handy `redirect()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   * @param [options.silent] A boolean specifying whether the router's observers should *not* be called (default: `false`).
   * @param [options.defer] A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).
   *
   * @example
   * ```
   * router.redirect('/sign-in');
   *
   * // Same as above, but in a more idiomatic way:
   * Session.SignIn.redirect();
   * ```
   *
   * @category Navigation
   * @possiblyasync
   */
  redirect(url: string | URL, options: NavigationOptions = {}) {
    const {silent = false, defer = false} = options;

    this._redirect(normalizeURL(url));

    if (silent) {
      return;
    }

    return possiblyDeferred(defer, () => {
      this.callObservers();
    });
  }

  abstract _redirect(url: URL): void;

  /**
   * Reloads the execution environment with the specified URL.
   *
   * Note that instead of using this method, you can use the handy `reload()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   *
   * @example
   * ```
   * router.reload('/');
   *
   * // Same as above, but in a more idiomatic way:
   * Frontend.Home.reload();
   * ```
   *
   * @category Navigation
   */
  reload(url?: string | URL) {
    const normalizedURL = url !== undefined ? normalizeURL(url) : undefined;

    this._reload(normalizedURL);
  }

  abstract _reload(url: URL | undefined): void;

  /**
   * Move forwards or backwards through the router's history.
   *
   * The observers of the router are automatically called.
   *
   * @param delta A number representing the position in the router's history to which you want to move, relative to the current entry. A negative value moves backwards, a positive value moves forwards.
   * @param [options.silent] A boolean specifying whether the router's observers should *not* be called (default: `false`).
   * @param [options.defer] A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).
   *
   * @example
   * ```
   * router.go(-2); // Move backwards by two entries of the router's history
   *
   * router.go(-1); // Equivalent of calling `router.goBack()`
   *
   * router.go(1); // Equivalent of calling `router.goForward()`
   *
   * router.go(2); // Move forward two entries of the router's history
   * ```
   *
   * @category Navigation
   * @possiblyasync
   */
  go(delta: number, options: NavigationOptions = {}) {
    const {silent = false, defer = false} = options;

    this._go(delta);

    if (silent) {
      return;
    }

    return possiblyDeferred(defer, () => {
      this.callObservers();
    });
  }

  abstract _go(delta: number): void;

  /**
   * Go back to the previous entry in the router's history.
   *
   * This method is the equivalent of calling `router.go(-1)`.
   *
   * The observers of the router are automatically called.
   *
   * @param [options.silent] A boolean specifying whether the router's observers should *not* be called (default: `false`).
   * @param [options.defer] A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).
   *
   * @category Navigation
   * @possiblyasync
   */
  goBack(options: NavigationOptions = {}) {
    return this.go(-1, options);
  }

  /**
   * Go forward to the next entry in the router's history.
   *
   * This method is the equivalent of calling `router.go(1)`.
   *
   * The observers of the router are automatically called.
   *
   * @param [options.silent] A boolean specifying whether the router's observers should *not* be called (default: `false`).
   * @param [options.defer] A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).
   *
   * @category Navigation
   * @possiblyasync
   */
  goForward(options: NavigationOptions = {}) {
    return this.go(1, options);
  }

  /**
   * Returns the number of entries in the router's history.
   *
   * @category Navigation
   */
  getHistoryLength() {
    return this._getHistoryLength();
  }

  abstract _getHistoryLength(): number;

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.
   *
   * @category Observability
   */

  // === Customization ===

  applyPlugins(plugins: RouterPlugin[]) {
    for (const plugin of plugins) {
      plugin(this);
    }
  }

  _addressableMethodWrappers: AddressableMethodWrapper[] = [];

  addAddressableMethodWrapper(methodWrapper: AddressableMethodWrapper) {
    // TODO: Support multiple addressable method wrappers

    if (this._addressableMethodWrappers.length > 0) {
      throw new Error('You cannot add more than one addressable method wrapper');
    }

    this._addressableMethodWrappers.push(methodWrapper);
  }

  callAddressableMethodWrapper(receiver: any, method: Function, params: any) {
    // TODO: Support multiple addressable method wrappers

    if (this._addressableMethodWrappers.length === 1) {
      const methodWrapper = this._addressableMethodWrappers[0];
      return methodWrapper(receiver, method, params);
    } else {
      return method.call(receiver, params);
    }
  }

  _customRouteDecorators: CustomRouteDecorator[] = [];

  addCustomRouteDecorator(decorator: CustomRouteDecorator) {
    this._customRouteDecorators.push(decorator);
  }

  applyCustomRouteDecorators(routable: any, method: Function) {
    for (const customRouteDecorator of this._customRouteDecorators) {
      customRouteDecorator.call(routable, method);
    }
  }

  Link!: (props: any) => any;

  // === Utilities ===

  static isRouter(value: any): value is Router {
    return isRouterInstance(value);
  }
}

function possiblyDeferred(defer: boolean, func: Function) {
  if (!defer) {
    func();
    return;
  }

  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      try {
        func();
      } catch (error) {
        reject(error);
        return;
      }

      resolve();
    }, 0);
  });
}
