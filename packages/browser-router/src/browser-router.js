import {AbstractRouter} from '@liaison/abstract-router';

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
    return new URL(window.location);
  }

  _navigate(url) {
    window.history.pushState(null, null, url);
  }

  _redirect(url) {
    window.history.replaceState(null, null, url);
  }

  _go(delta) {
    window.history.go(delta);
  }

  _getHistoryLength() {
    return window.history.length;
  }
}
