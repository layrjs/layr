import Path from 'path-parser';

export class Route {
  constructor(name, pattern, {aliases} = {}) {
    this.name = name;

    this.pattern = pattern;
    const _parsedPattern = new Path(pattern);
    Object.defineProperty(this, '_parsedPattern', {value: _parsedPattern});

    if (aliases !== undefined) {
      this.aliases = aliases;
      const _parsedAliases = aliases.map(alias => new Path(alias));
      Object.defineProperty(this, '_parsedAliases', {value: _parsedAliases});
    }
  }

  test(url) {
    const {pathname, search} = new URL(url);

    const path = pathname + search;

    const result = this._parsedPattern.test(path);
    if (result) {
      return result;
    }

    if (this.aliases) {
      for (const parsedAlias of this._parsedAliases) {
        const result = parsedAlias.test(path);
        if (result) {
          return result;
        }
      }
    }
  }

  build(params) {
    const parsedPattern = this._parsedPattern;

    // Since 'path-parser' ignore getters, let's call them explicitly
    const actualParams = {};
    for (const name of parsedPattern.params) {
      const value = params[name];
      if (value !== undefined) {
        actualParams[name] = value;
      }
    }

    return parsedPattern.build(actualParams);
  }
}
