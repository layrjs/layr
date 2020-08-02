import {normalizeURL, parseQuery, stringifyQuery} from '@liaison/abstract-router';
import {match, compile, MatchFunction, PathFunction} from 'path-to-regexp';
import pick from 'lodash/pick';

import {isRouteInstance} from './utilities';

export type RoutePattern = string;

export type RouteOptions = {
  aliases?: RoutePattern[];
};

export class Route {
  _name: string;
  _pattern: RoutePattern;
  _aliases: RoutePattern[];
  _matchers: MatchFunction[];
  _queryParamNames: string[];
  _compiler: PathFunction;

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

  getName() {
    return this._name;
  }

  getPattern() {
    return this._pattern;
  }

  getAliases() {
    return this._aliases;
  }

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

  generateURL(params?: object) {
    let url = this.generatePath(params);

    const queryString = this.generateQueryString(params);

    if (queryString !== '') {
      url += `?${queryString}`;
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

  static isRoute(value: any): value is Route {
    return isRouteInstance(value);
  }
}
