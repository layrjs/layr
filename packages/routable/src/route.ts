import {normalizeURL, parseQuery, stringifyQuery, URLOptions} from '@liaison/router';
import {match, compile, MatchFunction, PathFunction} from 'path-to-regexp';
import pick from 'lodash/pick';

export type RoutePattern = string;

export type RouteOptions = {
  aliases?: RoutePattern[];
};

/**
 * A `Route` represents a route in a [routable component](https://liaison.dev/docs/v1/reference/routable#routable-component-class).
 *
 * A route is composed of:
 *
 * - A name matching a static method of the [routable component](https://liaison.dev/docs/v1/reference/routable#routable-component-class) that contains the route.
 * - The canonical [URL pattern](https://liaison.dev/docs/v1/reference/route#url-pattern-type) of the route.
 * - Some [URL pattern](https://liaison.dev/docs/v1/reference/route#url-pattern-type) aliases.
 *
 * #### Usage
 *
 * Typically, you create a `Route` and associate it to a routable component using the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator.
 *
 * See an example of use in the [`Routable()`](https://liaison.dev/docs/v1/reference/routable#usage) mixin.
 */
export class Route {
  _name: string;
  _pattern: RoutePattern;
  _aliases: RoutePattern[];
  _matchers: MatchFunction[];
  _queryParamNames: string[];
  _compiler: PathFunction;

  /**
   * Creates an instance of [`Route`](https://liaison.dev/docs/v1/reference/route). Typically, instead of using this constructor, you would rather use the [`@route()`](https://liaison.dev/docs/v1/reference/routable#route-decorator) decorator.
   *
   * @param name The name of the route.
   * @param pattern The canonical [URL pattern](https://liaison.dev/docs/v1/reference/route#url-pattern-type) of the route.
   * @param [options.aliases] An array of alternate [URL patterns](https://liaison.dev/docs/v1/reference/route#url-pattern-type).
   *
   * @returns The [`Route`](https://liaison.dev/docs/v1/reference/route) instance that was created.
   *
   * @example
   * ```
   * const route = new Route('Home', '/', {aliases: ['/home']});
   * ```
   *
   * @category Creation
   */
  constructor(name: string, pattern: RoutePattern, options: RouteOptions = {}) {
    const {aliases = []} = options;

    this._name = name;
    this._pattern = pattern;
    this._aliases = aliases;

    this._matchers = [];
    this._queryParamNames = [];

    for (const pathAndQueryPattern of [pattern, ...aliases]) {
      const [pathPattern, queryPattern] = pathAndQueryPattern.split('\\?');

      this._matchers.push(match(pathPattern));

      if (queryPattern !== undefined) {
        const queryParams = queryPattern.split('&');

        for (const queryParam of queryParams) {
          if (queryParam === '') {
            continue;
          }

          if (!queryParam.startsWith(':')) {
            throw new Error(
              `A route query param should start with a colon (route name: '${name}', route pattern: '${pattern}')`
            );
          }

          const queryParamName = queryParam.slice(1);

          if (!this._queryParamNames.includes(queryParamName)) {
            this._queryParamNames.push(queryParamName);
          }
        }
      }
    }

    const [pathPattern] = pattern.split('\\?');

    this._compiler = compile(pathPattern);
  }

  /**
   * Returns the name of the route.
   *
   * @returns A string.
   *
   * @example
   * ```
   * const route = new Route('Home', '/');
   *
   * route.getName(); // => 'Home'
   * ```
   *
   * @category Basic Methods
   */
  getName() {
    return this._name;
  }

  /**
   * Returns the canonical URL pattern of the route.
   *
   * @returns An [URL pattern](https://liaison.dev/docs/v1/reference/route#url-pattern-type) string.
   *
   * @example
   * ```
   * const route = new Route('Viewer', '/movies/:slug\\?:showDetails');
   *
   * route.getPattern(); // => '/movies/:slug\\?:showDetails'
   * ```
   *
   * @category Basic Methods
   */
  getPattern() {
    return this._pattern;
  }

  /**
   * Returns the alternate URL patterns of the route.
   *
   * @returns An array of [URL pattern](https://liaison.dev/docs/v1/reference/route#url-pattern-type) strings.
   *
   * @example
   * ```
   * const route = new Route('Home', '/', {aliases: ['/home']});
   *
   * route.getAliases(); // => ['/home']
   * ```
   *
   * @category Basic Methods
   */
  getAliases() {
    return this._aliases;
  }

  /**
   * Checks if the route matches the specified URL.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   *
   * @returns If the route matches the specified URL, a plain object representing the parameters that are included in the URL (or an empty object if there is no parameters) is returned. Otherwise, `undefined` is returned.
   *
   * @example
   * ```
   * const route = new Route('Viewer', '/movies/:slug\\?:showDetails');
   *
   * route.matchURL('/movies/abc123'); // => {slug: 'abc123'}
   *
   * route.matchURL('/movies/abc123?showDetails=1'); // => {slug: 'abc123', showDetails: '1'}
   *
   * route.matchURL('/films'); // => undefined
   * ```
   *
   * @category URL Matching and Generation
   */
  matchURL(url: URL | string) {
    const {pathname: path, search: queryString} = normalizeURL(url);

    for (const matcher of this._matchers) {
      const result = matcher(path);

      if (result !== false) {
        let query = parseQuery(queryString);
        query = pick(query, this._queryParamNames);

        return {...result.params, ...query};
      }
    }

    return undefined;
  }

  /**
   * Generates an URL for the route.
   *
   * @param [params] An optional object representing the parameters to include in the generated URL.
   * @param [options.hash] A string representing an hash (i.e., a [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) to include in the generated URL.
   *
   * @returns A string.
   *
   * @example
   * ```
   * const route = new Route('Viewer', '/movies/:slug\\?:showDetails');
   *
   * route.generateURL({slug: 'abc123'}); // => '/movies/abc123'
   *
   * route.generateURL({slug: 'abc123', showDetails: '1'}); // => '/movies/abc123?showDetails=1'
   *
   * route.generateURL({}); // => Error (the slug parameter is mandatory)
   * ```
   *
   * @category URL Matching and Generation
   */
  generateURL(params?: object, options?: URLOptions) {
    let url = this.generatePath(params);

    const queryString = this.generateQueryString(params);

    if (queryString !== '') {
      url += `?${queryString}`;
    }

    if (options?.hash) {
      url += `#${options.hash}`;
    }

    return url;
  }

  generatePath(params?: object) {
    return this._compiler(params);
  }

  generateQueryString(params?: object) {
    const query = pick(params, this._queryParamNames);

    return stringifyQuery(query);
  }

  /**
   * @typedef URLPattern
   *
   * A string representing the canonical URL pattern (or an alternate URL pattern) of a route.
   *
   * An URL pattern is composed of a *path pattern* and an optional *query pattern* that are separated by an escaped question mark (`\\?`).
   *
   * A *path pattern* represents the path part of an URL and it can include some parameters by prefixing the name of each parameter with a colon sign (`:`). The [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) package is used under the hood to handle the path patterns, so any path pattern that is supported by `path-to-regexp` is supported by Liaison as well.
   *
   * A *query pattern* represents the query part of an URL and it is composed of a list of parameters separated by an ampersand sign (`&`). Just like a path parameter, a query parameter is represented by a name prefixed with a colon sign (`:`). When an URL is matched against an URL pattern with the [`matchURL()`](https://liaison.dev/docs/v1/reference/route#match-url-instance-method) method, the [`qs`](https://github.com/ljharb/qs) package is used under the hood to parse the query part of the URL.
   *
   * **Examples:**
   *
   * - `'/'`: Root URL pattern.
   * - `'/movies'`: URL pattern without parameters.
   * - `'/movies/:id'`: URL pattern with one path parameter (`id`).
   * - `'/movies/:movieId/actors/:actorId'`: URL pattern with two path parameter (`movieId` and `actorId`).
   * - `'/movies\\?:sortBy'`: URL pattern with one query parameter (`sortBy`).
   * - `'/movies\\?:sortBy&:offset'`: URL pattern with two query parameters (`sortBy` and `offset`).
   * - `'/movies/:id\\?:showDetails'`: URL pattern with one path parameter (`id`) and one query parameter (`showDetails`).
   * - `'/movies/:genre?'`: URL pattern with an [optional](https://github.com/pillarjs/path-to-regexp#optional) path parameter (`genre`).
   * - `'/:slugs*'`: URL pattern with [zero or more](https://github.com/pillarjs/path-to-regexp#zero-or-more) path parameters (`slugs`).
   * - `'/:slugs+'`: URL pattern with [one or more](https://github.com/pillarjs/path-to-regexp#one-or-more) path parameters (`slugs`).
   * - `'/movies/:id(\\d+)'`: URL pattern with one path parameter (`id`) restricted to digits.
   *
   * @category Types
   */

  static isRoute(value: any): value is Route {
    return isRouteInstance(value);
  }
}

/**
 * Returns whether the specified value is a route class.
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
 * Returns whether the specified value is a route instance.
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
