import {normalizeURL, parseQuery, stringifyQuery, URLOptions} from '@layr/router';

import {parsePattern, Pattern, PathMatcher, PathGenerator} from './pattern';
import {
  serializeParam,
  deserializeParam,
  parseParamTypeSpecifier,
  Params,
  ParamTypeDescriptor
} from './param';

export type AddressableOptions = {
  params?: Params;
  aliases?: Pattern[];
};

/**
 * Represents a route or a wrapper in a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class).
 *
 * An addressable is composed of:
 *
 * - A name matching a method of the [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that contains the addressable.
 * - The canonical [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) of the addressable.
 * - Some [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) aliases.
 *
 * #### Usage
 *
 * Typically, you create a `Route` (or a `Wrapper`) and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) (or [`@wrapper()`](https://layrjs.com/docs/v1/reference/routable#wrapper-decorator)) decorator.
 *
 * See an example of use in the [`Routable()`](https://layrjs.com/docs/v1/reference/routable#usage) mixin.
 */
export abstract class Addressable {
  _name: string;
  _patterns: {
    pattern: Pattern;
    matcher: PathMatcher;
    generator: PathGenerator;
    wrapperGenerator: PathGenerator;
  }[];
  _params: Record<string, ParamTypeDescriptor>;

  /**
   * Creates an instance of [`Addressable`](https://layrjs.com/docs/v1/reference/addressable). Typically, instead of using this constructor, you would rather use the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) (or [`@wrapper()`](https://layrjs.com/docs/v1/reference/routable#wrapper-decorator)) decorator.
   *
   * @param name The name of the addressable.
   * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) of the addressable.
   * @param [options.aliases] An array of alternate [URL patterns](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type).
   *
   * @returns The [`Addressable`](https://layrjs.com/docs/v1/reference/addressable) instance that was created.
   *
   * @example
   * ```
   * const addressable = new Addressable('Home', '/', {aliases: ['/home']});
   * ```
   *
   * @category Creation
   */
  constructor(name: string, pattern: Pattern, options: AddressableOptions = {}) {
    const {params = {}, aliases = []} = options;

    this._name = name;

    this._params = Object.create(null);

    for (const [name, typeSpecifier] of Object.entries(params)) {
      this._params[name] = {
        ...parseParamTypeSpecifier(typeSpecifier),
        specifier: typeSpecifier
      };
    }

    this._patterns = [];

    for (const patternOrAlias of [pattern, ...aliases]) {
      const {matcher, generator, wrapperGenerator} = parsePattern(patternOrAlias);
      this._patterns.push({pattern: patternOrAlias, matcher, generator, wrapperGenerator});
    }
  }

  /**
   * Returns the name of the addressable.
   *
   * @returns A string.
   *
   * @example
   * ```
   * const addressable = new Addressable('Home', '/');
   *
   * addressable.getName(); // => 'Home'
   * ```
   *
   * @category Basic Methods
   */
  getName() {
    return this._name;
  }

  /**
   * Returns the canonical URL pattern of the addressable.
   *
   * @returns An [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) string.
   *
   * @example
   * ```
   * const addressable = new Addressable('Viewer', '/movies/:slug\\?:showDetails');
   *
   * addressable.getPattern(); // => '/movies/:slug\\?:showDetails'
   * ```
   *
   * @category Basic Methods
   */
  getPattern() {
    return this._patterns[0].pattern;
  }

  getParams() {
    const params: Params = {};

    for (const [name, descriptor] of Object.entries(this._params)) {
      params[name] = descriptor.specifier;
    }

    return params;
  }

  /**
   * Returns the alternate URL patterns of the addressable.
   *
   * @returns An array of [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) strings.
   *
   * @example
   * ```
   * const addressable = new Addressable('Home', '/', {aliases: ['/home']});
   *
   * addressable.getAliases(); // => ['/home']
   * ```
   *
   * @category Basic Methods
   */
  getAliases() {
    return this._patterns.slice(1).map(({pattern}) => pattern);
  }

  /**
   * Checks if the addressable matches the specified URL.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   *
   * @returns If the addressable matches the specified URL, a plain object representing the parameters that are included in the URL (or an empty object if there is no parameters) is returned. Otherwise, `undefined` is returned.
   *
   * @example
   * ```
   * const addressable = new Addressable('Viewer', '/movies/:slug\\?:showDetails');
   *
   * addressable.matchURL('/movies/abc123'); // => {slug: 'abc123'}
   *
   * addressable.matchURL('/movies/abc123?showDetails=1'); // => {slug: 'abc123', showDetails: '1'}
   *
   * addressable.matchURL('/films'); // => undefined
   * ```
   *
   * @category URL Matching and Generation
   */
  matchURL(url: URL | string) {
    const {pathname: path, search: queryString} = normalizeURL(url);

    for (const {matcher, wrapperGenerator} of this._patterns) {
      const identifiers = matcher(path);

      if (identifiers !== undefined) {
        const query: Record<string, string> = parseQuery(queryString);
        const params: Record<string, any> = {};

        for (const [name, descriptor] of Object.entries(this._params)) {
          const queryValue = query[name];
          const paramValue = deserializeParam(name, queryValue, descriptor);
          params[name] = paramValue;
        }

        const wrapperPath = wrapperGenerator(identifiers);

        return {identifiers, params, wrapperPath};
      }
    }

    return undefined;
  }

  /**
   * Generates an URL for the addressable.
   *
   * @param [params] An optional object representing the parameters to include in the generated URL.
   * @param [options.hash] A string representing an hash (i.e., a [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) to include in the generated URL.
   *
   * @returns A string.
   *
   * @example
   * ```
   * const addressable = new Addressable('Viewer', '/movies/:slug\\?:showDetails');
   *
   * addressable.generateURL({slug: 'abc123'}); // => '/movies/abc123'
   *
   * addressable.generateURL({slug: 'abc123', showDetails: '1'}); // => '/movies/abc123?showDetails=1'
   *
   * addressable.generateURL({}); // => Error (the slug parameter is mandatory)
   * ```
   *
   * @category URL Matching and Generation
   */
  generateURL(
    identifiers?: Record<string, any>,
    params?: Record<string, any>,
    options?: URLOptions
  ) {
    let url = this.generatePath(identifiers);

    const queryString = this.generateQueryString(params);

    if (queryString !== '') {
      url += `?${queryString}`;
    }

    if (options?.hash) {
      url += `#${options.hash}`;
    }

    return url;
  }

  generatePath(identifiers?: Record<string, any>) {
    return this._patterns[0].generator(identifiers);
  }

  generateQueryString(params: Record<string, any> = {}) {
    const query: Record<string, string | undefined> = {};

    for (const [name, descriptor] of Object.entries(this._params)) {
      const paramValue = params[name];
      const queryValue = serializeParam(name, paramValue, descriptor);
      query[name] = queryValue;
    }

    return stringifyQuery(query);
  }

  /**
   * @typedef URLPattern
   *
   * A string representing the canonical URL pattern (or an alternate URL pattern) of an addressable.
   *
   * An URL pattern is composed of a *path pattern* and an optional *query pattern* that are separated by an escaped question mark (`\\?`).
   *
   * A *path pattern* represents the path part of an URL and it can include some parameters by prefixing the name of each parameter with a colon sign (`:`). The [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) package is used under the hood to handle the path patterns, so any path pattern that is supported by `path-to-regexp` is supported by Layr as well.
   *
   * A *query pattern* represents the query part of an URL and it is composed of a list of parameters separated by an ampersand sign (`&`). Just like a path parameter, a query parameter is represented by a name prefixed with a colon sign (`:`). When an URL is matched against an URL pattern with the [`matchURL()`](https://layrjs.com/docs/v1/reference/addressable#match-url-instance-method) method, the [`qs`](https://github.com/ljharb/qs) package is used under the hood to parse the query part of the URL.
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

  static isAddressable(value: any): value is Addressable {
    return isAddressableInstance(value);
  }
}

/**
 * Returns whether the specified value is an [`Addressable`](https://layrjs.com/docs/v1/reference/addressable) class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isAddressableClass(value: any): value is typeof Addressable {
  return typeof value?.isAddressable === 'function';
}

/**
 * Returns whether the specified value is an [`Addressable`](https://layrjs.com/docs/v1/reference/addressable) instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isAddressableInstance(value: any): value is Addressable {
  return typeof value?.constructor?.isAddressable === 'function';
}
