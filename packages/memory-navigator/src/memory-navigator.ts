import {Navigator, NavigatorOptions, normalizeURL} from '@layr/navigator';

export type MemoryNavigatorOptions = NavigatorOptions & {
  initialURLs?: string[];
  initialIndex?: number;
};

/**
 * *Inherits from [`Navigator`](https://layrjs.com/docs/v2/reference/navigator).*
 *
 * A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator) that keeps the navigation history in memory. Useful in tests and non-browser environments like [React Native](https://reactnative.dev/).
 *
 * #### Usage
 *
 * Create a `MemoryNavigator` instance and register some [routable components](https://layrjs.com/docs/v2/reference/routable#routable-component-class) into it.
 *
 * See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
 */
export class MemoryNavigator extends Navigator {
  _urls: URL[];
  _index: number;

  /**
   * Creates a [`MemoryNavigator`](https://layrjs.com/docs/v2/reference/memory-navigator).
   *
   * @param [options.initialURLs] An array of URLs to populate the initial navigation history (default: `[]`).
   * @param [options.initialIndex] A number specifying the current entry's index in the navigation history (default: the index of the last entry in the navigation history).
   *
   * @returns The [`MemoryNavigator`](https://layrjs.com/docs/v2/reference/memory-navigator) instance that was created.
   *
   * @category Creation
   */
  constructor(options: MemoryNavigatorOptions = {}) {
    const {initialURLs = [], initialIndex = initialURLs.length - 1, ...otherOptions} = options;

    super(otherOptions);

    this._urls = initialURLs.map(normalizeURL);
    this._index = initialIndex;
  }

  // === Current Location ===

  /**
   * See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#current-location) class.
   *
   * @category Current Location
   */

  _getCurrentURL() {
    if (this._index === -1) {
      throw new Error('The navigator has no current URL');
    }

    return this._urls[this._index];
  }

  // === Navigation ===

  /**
   * See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v2/reference/navigator#navigation) class.
   *
   * @category Navigation
   */

  _navigate(url: URL) {
    this._urls.splice(this._index + 1);
    this._urls.push(url);
    this._index++;
  }

  _redirect(url: URL) {
    if (this._index === -1) {
      throw new Error('The navigator has no current URL');
    }

    this._urls.splice(this._index);
    this._urls.push(url);
  }

  _reload(_url: URL | undefined): void {
    throw new Error(`The method 'reload() is not available in a memory navigator`);
  }

  _go(delta: number) {
    let index = this._index;

    index += delta;

    if (index < 0 || index > this._urls.length - 1) {
      throw new Error('Cannot go to an entry that does not exist in the navigator history');
    }

    this._index = index;
  }

  _getHistoryLength() {
    return this._urls.length;
  }

  _getHistoryIndex() {
    return this._index;
  }

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.
   *
   * @category Observability
   */
}
