import {AbstractRouter} from '@liaison/abstract-router';
import {normalizeURL, stringifyURL} from '@liaison/routable';

export class BrowserRouter extends AbstractRouter {
  constructor(routables, options) {
    super(routables, options);

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

  _navigate(url) {
    window.history.pushState(null, null, stringifyURL(url));
  }

  _redirect(url) {
    window.history.replaceState(null, null, stringifyURL(url));
  }

  _go(delta) {
    window.history.go(delta);
  }

  _getHistoryLength() {
    return window.history.length;
  }
}
