import type {Component} from '@liaison/component';
import {
  AbstractRouter,
  AbstractRouterOptions,
  normalizeURL,
  stringifyURL
} from '@liaison/abstract-router';

export type BrowserRouterOptions = AbstractRouterOptions;

export class BrowserRouter extends AbstractRouter {
  constructor(rootComponent?: typeof Component, options: BrowserRouterOptions = {}) {
    super(rootComponent, options);

    window.addEventListener('popstate', () => {
      this.callObservers();
    });
  }

  reload() {
    window.location.reload();
  }

  _getCurrentURL() {
    return normalizeURL(window.location.href);
  }

  _navigate(url: URL) {
    window.history.pushState(null, '', stringifyURL(url));
  }

  _redirect(url: URL) {
    window.history.replaceState(null, '', stringifyURL(url));
  }

  _go(delta: number) {
    window.history.go(delta);
  }

  _getHistoryLength() {
    return window.history.length;
  }
}
