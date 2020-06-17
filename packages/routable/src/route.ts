import {normalizeURL} from '@liaison/abstract-router';
import {Path} from 'path-parser';
import {PlainObject} from 'core-helpers';

import {isRouteInstance} from './utilities';

export type RoutePattern = string;

export type RouteOptions = {
  aliases?: RoutePattern[];
};

export class Route {
  _name: string;
  _pattern: RoutePattern;
  _parsedPattern: Path;
  _aliases: RoutePattern[];
  _parsedAliases: Path[];

  constructor(name: string, pattern: RoutePattern, options: RouteOptions = {}) {
    const {aliases = []} = options;

    this._name = name;

    this._pattern = pattern;
    this._parsedPattern = new Path(pattern, {urlParamsEncoding: 'none'});

    this._aliases = aliases;
    this._parsedAliases = aliases.map((alias) => new Path(alias, {urlParamsEncoding: 'none'}));
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

  matchURL(url: string | URL) {
    const normalizedURL = normalizeURL(url);

    const {pathname, search} = normalizedURL;
    const path = pathname + search;

    const parsedPattern = this._parsedPattern;

    const result = parsedPattern.test(path);

    if (result !== null) {
      return result;
    }

    const parsedAliases = this._parsedAliases;

    for (const parsedAlias of parsedAliases) {
      const result = parsedAlias.test(path);

      if (result !== null) {
        return result;
      }
    }

    return undefined;
  }

  generateURL(params?: any) {
    const parsedPattern = this._parsedPattern;

    // Since 'path-parser' ignore non-enumerable properties,
    // let's generate a plain object

    const plainParams: PlainObject = {};

    for (const name of parsedPattern.params) {
      const value = params?.[name];

      if (value !== undefined) {
        plainParams[name] = value;
      }
    }

    const url = parsedPattern.build(plainParams);

    return url;
  }

  static isRoute(value: any): value is Route {
    return isRouteInstance(value);
  }
}
