import {AbstractRouter, AbstractRouterOptions, normalizeURL} from '@liaison/abstract-router';

export type MemoryRouterOptions = AbstractRouterOptions & {
  initialURLs?: string[];
  initialIndex?: number;
};

export class MemoryRouter extends AbstractRouter {
  _urls: URL[];
  _index: number;

  constructor(options: MemoryRouterOptions = {}) {
    const {initialURLs = [], initialIndex = initialURLs.length - 1, ...otherOptions} = options;

    super(otherOptions);

    this._urls = initialURLs.map(normalizeURL);
    this._index = initialIndex;
  }

  _getCurrentURL() {
    if (this._index === -1) {
      throw new Error('The router has no current URL');
    }

    return this._urls[this._index];
  }

  _navigate(url: URL) {
    this._urls.splice(this._index + 1);
    this._urls.push(url);
    this._index++;
  }

  _redirect(url: URL) {
    if (this._index === -1) {
      throw new Error('The router has no current URL');
    }

    this._urls.splice(this._index);
    this._urls.push(url);
  }

  _reload(_url: URL | undefined): void {
    throw new Error(`The method 'reload() is not available in a memory router`);
  }

  _go(delta: number) {
    let index = this._index;

    index += delta;

    if (index < 0 || index > this._urls.length - 1) {
      throw new Error('Cannot go to an entry that does not exist in the router history');
    }

    this._index = index;
  }

  _getHistoryLength() {
    return this._urls.length;
  }
}
