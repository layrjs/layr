import {Path} from 'path-parser';
import ow from 'ow';

import {isRoute, normalizeURL} from './utilities';

export class Route {
  constructor(name, pattern, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(pattern, 'pattern', ow.string.nonEmpty);
    ow(options, 'options', ow.object.exactShape({aliases: ow.optional.array}));

    const {aliases = []} = options;

    this._name = name;

    this._pattern = pattern;
    const _parsedPattern = new Path(pattern);
    Object.defineProperty(this, '_parsedPattern', {value: _parsedPattern});

    this._aliases = aliases;
    const _parsedAliases = aliases.map(alias => new Path(alias));
    Object.defineProperty(this, '_parsedAliases', {value: _parsedAliases});
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

  matchURL(url) {
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
  }

  generateURL(params) {
    ow(params, 'params', ow.optional.object);

    const parsedPattern = this._parsedPattern;

    // Since 'path-parser' ignore non-enumerable properties,
    // let's generate a plain object

    const plainParams = {};

    for (const name of parsedPattern.params) {
      const value = params[name];

      if (value !== undefined) {
        plainParams[name] = value;
      }
    }

    const url = parsedPattern.build(plainParams);

    return url;
  }

  static isRoute(object) {
    return isRoute(object);
  }
}
