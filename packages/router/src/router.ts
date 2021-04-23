import {Component, assertIsComponentClass} from '@layr/component';
import {Observable} from '@layr/observable';
import {assertNoUnknownOptions} from 'core-helpers';

import {RoutableLike, isRoutableLikeClass, assertIsRoutableLikeClass} from './routable-like';
import {isRouterInstance, normalizeURL, stringifyURL, parseQuery} from './utilities';

declare global {
  interface Function {
    matchURL: (url: URL | string) => {attributes: any; params: any} | undefined;
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

  // === Root components ===

  _rootComponents = new Set<typeof Component>();

  /**
   * Registers all the [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that are provided (directly or recursively) by the specified root component.
   *
   * @param rootComponent A [`Component`](https://layrjs.com/docs/v1/reference/component) class.
   *
   * @example
   * ```
   * import {Component} from '﹫layr/component';
   * import {Routable} from '﹫layr/routable';
   * import {BrowserRouter} from '﹫layr/browser-router';
   *
   * class User extends Routable(Component) {
   *   // ...
   * }
   *
   * class Movie extends Routable(Component) {
   *   // ...
   * }
   *
   * class Frontend extends Component {
   *   ﹫provide() static User = User;
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * const router = new BrowserRouter();
   *
   * router.registerRootComponent(Frontend); // User and Movie will be registered
   * ```
   *
   * @category Component Registration
   */
  registerRootComponent(rootComponent: typeof Component) {
    assertIsComponentClass(rootComponent);

    this._rootComponents.add(rootComponent);

    let routableCount = 0;

    const registerIfComponentIsRoutable = (component: typeof Component) => {
      if (isRoutableLikeClass(component)) {
        this.registerRoutable(component);
        routableCount++;
      }
    };

    registerIfComponentIsRoutable(rootComponent);

    for (const providedComponent of rootComponent.getProvidedComponents({deep: true})) {
      registerIfComponentIsRoutable(providedComponent);
    }

    if (routableCount === 0) {
      throw new Error(
        `No routable components were found from the specified root component '${rootComponent.describeComponent()}'`
      );
    }
  }

  /**
   * Gets all the root components that are registered into the router.
   *
   * @returns An iterator of [`Component`](https://layrjs.com/docs/v1/reference/component) classes.
   *
   * @category Component Registration
   */
  getRootComponents() {
    return this._rootComponents.values();
  }

  // === Routables ===

  _routables = new Map<string, typeof RoutableLike>();

  /**
   * Gets a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that is registered into the router. An error is thrown if there is no routable component with the specified name.
   *
   * @param name The name of the routable component to get.
   *
   * @returns A [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) class.
   *
   * @example
   * ```
   * // See the definition of `router` in the `registerRootComponent()` example
   *
   * router.getRoutable('Movie'); // => Movie class
   * router.getRoutable('User'); // => User class
   * router.getRoutable('Film'); // => Error
   * ```
   *
   * @category Component Registration
   */
  getRoutable(name: string) {
    const routable = this._getRoutable(name);

    if (routable !== undefined) {
      return routable;
    }

    throw new Error(`The routable component '${name}' is not registered in the router`);
  }

  /**
   * Returns whether a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) is registered into the router.
   *
   * @param name The name of the routable component to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * // See the definition of `router` in the `registerRootComponent()` example
   *
   * router.hasRoutable('Movie'); // => true
   * router.hasRoutable('User'); // => true
   * router.hasRoutable('Film'); // => false
   * ```
   *
   * @category Component Registration
   */
  hasRoutable(name: string) {
    return this._getRoutable(name) !== undefined;
  }

  _getRoutable(name: string) {
    return this._routables.get(name);
  }

  /**
   * Registers a specific [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) into the router. Typically, instead of using this method, you would rather use the [`registerRootComponent()`](https://layrjs.com/docs/v1/reference/router#register-root-component-instance-method) method to register multiple routable components at once.
   *
   * @param routable The [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) class to register.
   *
   * @example
   * ```
   * class Movie extends Routable(Component) {
   *   // ...
   * }
   *
   * const router = new BrowserRouter();
   *
   * router.registerRoutable(Movie);
   * ```
   *
   * @category Component Registration
   */
  registerRoutable(routable: typeof RoutableLike) {
    assertIsRoutableLikeClass(routable);

    if (routable.hasRouter()) {
      if (routable.getRouter() === this) {
        return;
      }

      throw new Error(
        `Cannot register a routable component that is already registered in another router (${routable.describeComponent()})`
      );
    }

    const routableName = routable.getComponentName();

    const existingRoutable = this._routables.get(routableName);

    if (existingRoutable !== undefined) {
      throw new Error(
        `A routable component with the same name is already registered (${existingRoutable.describeComponent()})`
      );
    }

    routable.__setRouter(this);

    this._routables.set(routableName, routable);
  }

  /**
   * Gets all the [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that are registered into the router.
   *
   * @returns An iterator of [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) classes.
   *
   * @category Component Registration
   */
  getRoutables() {
    return this._routables.values();
  }

  // === Routes ===

  /**
   * Finds the first route that matches the specified URL.
   *
   * If no route matches the specified URL, returns `undefined`.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   *
   * @returns An object of the shape `{routable, route, params}` (or `undefined` if no route was found) where `routable` is the [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) containing the route that was found, `route` is the [route](https://layrjs.com/docs/v1/reference/route) that was found, and `params` is a plain object representing the parameters that are included in the specified URL.
   *
   * @example
   * ```
   * class Movie extends Routable(Component) {
   *   // ...
   *
   *   ﹫route('/movies/:slug') ﹫view() static Viewer() {
   *     // ...
   *   }
   * }
   *
   * const router = new BrowserRouter();
   * router.registerRoutable(Movie);
   *
   * const {routable, route, params} = router.findRouteByURL('/movies/inception');
   *
   * routable; // => Movie class
   * route; // => Viewer() route
   * params; // => {slug: 'inception'}
   * ```
   *
   * @category Routes
   */
  findRouteByURL(url: URL | string) {
    for (const routableClass of this.getRoutables()) {
      let routable: typeof RoutableLike | RoutableLike = routableClass;

      let result = routable.findRouteByURL(url);

      if (result !== undefined) {
        return {routable, ...result};
      }

      routable = routableClass.prototype;

      result = routable.findRouteByURL(url);

      if (result !== undefined) {
        return {routable, ...result};
      }
    }

    return undefined;
  }

  getAttributesFromURL(url: URL | string) {
    const result = this.findRouteByURL(url);

    if (result === undefined) {
      throw new Error(`Couldn't find a route matching the specified URL (URL: '${url}')`);
    }

    return result.attributes;
  }

  /**
   * Returns the parameters that are included in the specified URL.
   *
   * If no route matches the specified URL, throws an error.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   *
   * @returns A plain object representing the parameters that are included in the specified URL.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.getParamsFromURL('/movies/inception'); // => {slug: 'inception'}
   * ```
   *
   * @category Routes
   */
  getParamsFromURL(url: URL | string) {
    const result = this.findRouteByURL(url);

    if (result === undefined) {
      throw new Error(`Couldn't find a route matching the specified URL (URL: '${url}')`);
    }

    return result.params;
  }

  /**
   * Calls the method associated to the first route that matches the specified URL.
   *
   * If no route matches the specified URL, calls the specified fallback or throws an error if no fallback is specified.
   *
   * When a route is found, the associated method is called with the parameters that are included in the specified URL.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   * @param [options.fallback] A function to call in case no route matches the specified URL (default: `undefined`).
   *
   * @returns The result of the method associated to the route that was found or the result of the specified fallback if no route was found.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.callRouteByURL('/movies/inception'); // => Some React elements
   *
   * // `Movie.Viewer()` was called as follows:
   * // Movie.Viewer({slug: 'inception'});
   * ```
   *
   * @category Routes
   */
  callRouteByURL(url: URL | string, options: {fallback?: Function} = {}) {
    const {fallback} = options;

    const result = this.findRouteByURL(url);

    if (result !== undefined) {
      const {routable, route, attributes, params} = result;

      return routable.__callRoute(route, attributes, params);
    }

    if (fallback !== undefined) {
      return fallback();
    }

    throw new Error(`Couldn't find a route matching the specified URL (URL: '${url}')`);
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

  getCurrentAttributes() {
    return this.getAttributesFromURL(this._getCurrentURL());
  }

  /**
   * Returns the parameters that are included in the current URL of the router.
   *
   * @returns A plain object.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.navigate('/movies/inception?showDetails=1#actors');
   * router.getCurrentParams(); // => {slug: 'inception'}
   * ```
   *
   * @category Current Location
   */
  getCurrentParams() {
    return this.getParamsFromURL(this._getCurrentURL());
  }

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

  /**
   * Calls the method associated to the first route that matches the current URL.
   *
   * If no route matches the current URL, calls the specified fallback or throws an error if no fallback is specified.
   *
   * When a route is found, the associated method is called with the parameters that are included in the current URL.
   *
   * @param [options.fallback] A function to call in case no route matches the current URL (default: `undefined`).
   *
   * @returns The result of the method associated to the route that was found or the result of the specified fallback if no route was found.
   *
   * @example
   * ```
   * // See the definition of `router` in the `findRouteByURL()` example
   *
   * router.navigate('/movies/inception');
   * router.callCurrentRoute(); // => Some React elements
   *
   * // `Movie.Viewer()` was called as follows:
   * // Movie.Viewer({slug: 'inception'});
   * ```
   *
   * @category Current Location
   */
  callCurrentRoute(options: {fallback?: Function} = {}) {
    const {fallback} = options;

    const url = this._getCurrentURL();

    return this.callRouteByURL(url, {fallback});
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

  Link!: (props: any) => any;

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

  _customRouteDecorators: CustomRouteDecorator[] = [];

  addCustomRouteDecorator(decorator: CustomRouteDecorator) {
    this._customRouteDecorators.push(decorator);
  }

  applyCustomRouteDecorators(routable: typeof RoutableLike | RoutableLike, method: Function) {
    for (const customRouteDecorator of this._customRouteDecorators) {
      customRouteDecorator.call(routable, method);
    }
  }

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
