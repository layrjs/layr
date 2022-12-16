import {normalizeURL, parseQuery, stringifyQuery, URLOptions} from '@layr/navigator';
import {possiblyAsync} from 'possibly-async';
import isEmpty from 'lodash/isEmpty';

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
  filter?: Filter;
  transformers?: Transformers;
};

export type Filter = (request: any) => boolean;

export type Transformers = {
  input?: (params?: any, request?: any) => any;
  output?: (result?: any, request?: any) => any;
  error?: (error?: any, request?: any) => any;
};

/**
 * An abstract class from which the classes [`Route`](https://layrjs.com/docs/v2/reference/route) and [`Wrapper`](https://layrjs.com/docs/v2/reference/wrapper) are constructed.
 *
 * An addressable is composed of:
 *
 * - A name matching a method of a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
 * - The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the addressable.
 * - Some optional [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type) associated with the addressable.
 * - Some optional [URL pattern aliases](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) associated with the addressable.
 *
 * #### Usage
 *
 * Typically, you create a `Route` or a `Wrapper` and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) or [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorators.
 *
 * See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
 */
export abstract class Addressable {
  _name: string;
  _patterns: {
    pattern: Pattern;
    matcher: PathMatcher;
    generator: PathGenerator;
    wrapperGenerator: PathGenerator;
  }[];
  _isCatchAll: boolean;
  _params: Record<string, ParamTypeDescriptor>;
  _filter: Filter | undefined;
  _transformers: Transformers;

  /**
   * Creates an instance of [`Addressable`](https://layrjs.com/docs/v2/reference/addressable), which can represent a [`Route`](https://layrjs.com/docs/v2/reference/route) or a [`Wrapper`](https://layrjs.com/docs/v2/reference/wrapper).
   *
   * Typically, instead of using this constructor, you would rather use the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) or [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorators.
   *
   * @param name The name of the addressable.
   * @param pattern The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the addressable.
   * @param [options.parameters] An optional object containing some [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type).
   * @param [options.aliases] An optional array containing some [URL pattern aliases](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type).
   *
   * @returns The [`Addressable`](https://layrjs.com/docs/v2/reference/addressable) instance that was created.
   *
   * @example
   * ```
   * const addressable = new Addressable('View', '/', {aliases: ['/home']});
   * ```
   *
   * @category Creation
   */
  constructor(name: string, pattern: Pattern, options: AddressableOptions = {}) {
    const {params = {}, aliases = [], filter, transformers = {}} = options;

    this._name = name;

    this._params = Object.create(null);

    for (const [name, typeSpecifier] of Object.entries(params)) {
      this._params[name] = {
        ...parseParamTypeSpecifier(typeSpecifier),
        specifier: typeSpecifier
      };
    }

    this._patterns = [];

    this._isCatchAll = false;

    for (const patternOrAlias of [pattern, ...aliases]) {
      const {matcher, generator, wrapperGenerator, isCatchAll} = parsePattern(patternOrAlias);
      this._patterns.push({pattern: patternOrAlias, matcher, generator, wrapperGenerator});

      if (isCatchAll) {
        this._isCatchAll = true;
      }
    }

    if (this._isCatchAll && this._patterns.length > 1) {
      throw new Error(
        `Couldn't create the addressable '${name}' (a catch-all addressable cannot have aliases)`
      );
    }

    this._filter = filter;
    this._transformers = transformers;
  }

  /**
   * Returns the name of the addressable.
   *
   * @returns A string.
   *
   * @example
   * ```
   * const addressable = new Addressable('View', '/');
   *
   * addressable.getName(); // => 'View'
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
   * @returns An [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) string.
   *
   * @example
   * ```
   * const addressable = new Addressable('View', '/movies/:slug', {aliases: ['/films/:slug']});
   *
   * addressable.getPattern(); // => '/movies/:slug'
   * ```
   *
   * @category Basic Methods
   */
  getPattern() {
    return this._patterns[0].pattern;
  }

  isCatchAll() {
    return this._isCatchAll;
  }

  getParams() {
    const params: Params = {};

    for (const [name, descriptor] of Object.entries(this._params)) {
      params[name] = descriptor.specifier;
    }

    return params;
  }

  /**
   * Returns the URL pattern aliases of the addressable.
   *
   * @returns An array of [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) strings.
   *
   * @example
   * ```
   * const addressable = new Addressable('View', '/', {aliases: ['/home']});
   *
   * addressable.getAliases(); // => ['/home']
   * ```
   *
   * @category Basic Methods
   */
  getAliases() {
    return this._patterns.slice(1).map(({pattern}) => pattern);
  }

  getFilter() {
    return this._filter;
  }

  getTransformers() {
    return this._transformers;
  }

  transformMethod(method: Function, request: any) {
    const transformers = this._transformers;

    if (isEmpty(transformers)) {
      // OPTIMIZATION
      return method;
    }

    return function (this: any, params: any) {
      if (transformers.input !== undefined) {
        params = transformers.input.call(this, params, request);
      }

      return possiblyAsync.invoke(
        () => method.call(this, params),
        (result) => {
          if (transformers.output !== undefined) {
            result = transformers.output.call(this, result, request);
          }

          return result;
        },
        (error) => {
          if (transformers.error !== undefined) {
            return transformers.error.call(this, error, request);
          }

          throw error;
        }
      );
    };
  }

  /**
   * Checks if the addressable matches the specified URL.
   *
   * @param url A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
   *
   * @returns If the addressable matches the specified URL, a plain object containing the identifiers and parameters included in the URL is returned. Otherwise, `undefined` is returned.
   *
   * @example
   * ```
   * const addressable = new Addressable('View', '/movies/:slug', {
   *  params: {showDetails: 'boolean?'}
   * });
   *
   * addressable.matchURL('/movies/abc123');
   * // => {identifiers: {slug: 'abc123'}, parameters: {showDetails: undefined}}
   *
   * addressable.matchURL('/movies/abc123?showDetails=1');
   * // => {identifiers: {slug: 'abc123'}, parameters: {showDetails: true}}
   *
   * addressable.matchURL('/films'); // => undefined
   * ```
   *
   * @category URL Matching and Generation
   */
  matchURL(url: URL | string, request?: any) {
    const {pathname: path, search: queryString} = normalizeURL(url);

    const result = this.matchPath(path, request);

    if (result !== undefined) {
      const query: Record<string, string> = parseQuery(queryString);
      const params: Record<string, any> = {};

      for (const [name, descriptor] of Object.entries(this._params)) {
        const queryValue = query[name];
        const paramValue = deserializeParam(name, queryValue, descriptor);
        params[name] = paramValue;
      }

      return {params, ...result};
    }

    return undefined;
  }

  matchPath(path: string, request?: any) {
    for (const {matcher, wrapperGenerator} of this._patterns) {
      const identifiers = matcher(path);

      if (identifiers === undefined) {
        continue;
      }

      if (this._filter !== undefined && !this._filter(request)) {
        continue;
      }

      const wrapperPath = wrapperGenerator(identifiers);

      return {identifiers, wrapperPath};
    }

    return undefined;
  }

  /**
   * Generates an URL for the addressable.
   *
   * @param [identifiers] An optional object containing the identifiers to include in the generated URL.
   * @param [params] An optional object containing the parameters to include in the generated URL.
   * @param [options.hash] An optional string specifying a hash (i.e., a [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) to include in the generated URL.
   *
   * @returns A string.
   *
   * @example
   * ```
   * const addressable = new Addressable('View', '/movies/:slug', {
   *  params: {showDetails: 'boolean?'}
   * });
   *
   * addressable.generateURL({slug: 'abc123'}); // => '/movies/abc123'
   *
   * addressable.generateURL({slug: 'abc123'}, {showDetails: true});
   * // => '/movies/abc123?showDetails=1'
   *
   * addressable.generateURL({slug: 'abc123'}, {showDetails: true}, {hash: 'actors'});
   * // => '/movies/abc123?showDetails=1#actors'
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
   * A string defining the canonical URL pattern (or an URL pattern alias) of an addressable.
   *
   * An URL pattern is composed of a *route pattern* (e.g., `'/movies'`) and can be prefixed with a *wrapper pattern*, which should be enclosed with square brackets (e.g., `'[/admin]'`).
   *
   * *Route patterns* and *wrapper patterns* can be composed of several *segments* separated by slashes (e.g., `'/movies/top-50'` or `'[/admin/movies]'`).
   *
   * A *segment* can be an arbitrary string (e.g., `'movies'`) or the name of a [component identifier attribute](https://layrjs.com/docs/v2/reference/identifier-attribute) (e.g., `'id'`) prefixed with a colon sign (`':'`). Note that a component identifier attribute can reference an identifier attribute of a related component (e.g., `'collection.id'`).
   *
   * Optionally, an URL pattern can be suffixed with wildcard character (`'*'`) to represent a catch-all URL.
   *
   * **Examples:**
   *
   * - `'/'`: Root URL pattern.
   * - `'/movies'`: URL pattern without identifier attributes.
   * - `'/movies/:id'`: URL pattern with one identifier attribute (`id`).
   * - `'/collections/:collection.id/movies/:id'`: URL pattern with two identifier attributes (`collection.id` and `id`).
   * - `[/]movies`: URL pattern composed of a wrapper pattern (`'[/]'`) and a route pattern (`'movies'`).
   * - `'[/collections/:collection.id]/movies/:id'`: URL pattern composed of a wrapper pattern (`'[/collections/:collection.id]'`), a route pattern (`'/movies/:id'`), and two identifier attributes (`collection.id` and `id`).
   * - `'/*'`: URL pattern that can match any URL. It can be helpful to display, for example, a "Not Found" page.
   *
   * @category Types
   */

  /**
   * @typedef URLParameters
   *
   * An object defining the URL parameters of an addressable.
   *
   * The object can contain some pairs of `name` and `type` where `name` should be an arbitrary string representing the name of an URL parameter and `type` should be a string representing its type.
   *
   * Currently, `type` can be one of the following strings:
   *
   * - `'boolean'`
   * - `'number'`
   * - `'string'`
   * - `'Date'`
   *
   * Optionally, `type` can be suffixed with a question mark (`'?'`) to specify an optional URL parameter.
   *
   * **Examples:**
   *
   * - `{step: 'number'}
   * - `{showDetails: 'boolean?'}`
   * - `{page: 'number?', orderBy: 'string?'}`
   *
   * @category Types
   */

  static isAddressable(value: any): value is Addressable {
    return isAddressableInstance(value);
  }
}

/**
 * Returns whether the specified value is an [`Addressable`](https://layrjs.com/docs/v2/reference/addressable) class.
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
 * Returns whether the specified value is an [`Addressable`](https://layrjs.com/docs/v2/reference/addressable) instance.
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
