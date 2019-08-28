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
    const {pathname} = new URL(url);

    const result = this._parsedPattern.test(pathname);
    if (result) {
      return result;
    }

    if (this.aliases) {
      for (const parsedAlias of this._parsedAliases) {
        const result = parsedAlias.test(pathname);
        if (result) {
          return result;
        }
      }
    }
  }
}
