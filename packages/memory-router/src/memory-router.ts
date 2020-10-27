import {Router, RouterOptions, normalizeURL} from '@layr/router';

export type MemoryRouterOptions = RouterOptions & {
  initialURLs?: string[];
  initialIndex?: number;
};

/**
 * *Inherits from [`Router`](https://layrjs.com/docs/v1/reference/router).*
 *
 * A [`Router`](https://layrjs.com/docs/v1/reference/router) that keeps the navigation history in memory. Useful in tests and non-browser environments like [React Native](https://reactnative.dev/).
 *
 * #### Usage
 *
 * Create a `MemoryRouter` instance and register some [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) into it.
 *
 * See an example of use in the [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) class.
 */
export class MemoryRouter extends Router {
  _urls: URL[];
  _index: number;

  /**
   * Creates a [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router).
   *
   * @param [options.initialURLs] An array of URLs to populate the initial navigation history (default: `[]`).
   * @param [options.initialIndex] A number specifying the current entry's index in the navigation history (default: the index of the last entry in the navigation history).
   *
   * @returns The [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router) instance that was created.
   *
   * @category Creation
   */
  constructor(options: MemoryRouterOptions = {}) {
    const {initialURLs = [], initialIndex = initialURLs.length - 1, ...otherOptions} = options;

    super(otherOptions);

    this._urls = initialURLs.map(normalizeURL);
    this._index = initialIndex;
  }

  // === Component Registration ===

  /**
   * See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#component-registration) class.
   *
   * @category Component Registration
   */

  // === Routes ===

  /**
   * See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#routes) class.
   *
   * @category Routes
   */

  // === Current Location ===

  /**
   * See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#current-location) class.
   *
   * @category Current Location
   */

  _getCurrentURL() {
    if (this._index === -1) {
      throw new Error('The router has no current URL');
    }

    return this._urls[this._index];
  }

  // === Navigation ===

  /**
   * See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#navigation) class.
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

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.
   *
   * @category Observability
   */
}
