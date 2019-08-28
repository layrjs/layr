import {Registerable} from '@liaison/layer';
import {Observable} from '@liaison/observable';

import {isRoutable} from './routable';

export class BrowserRouter extends Observable(Registerable()) {
  constructor({plugins} = {}) {
    super();

    if (plugins !== undefined) {
      this._applyPlugins(plugins);
    }

    window.addEventListener('popstate', () => {
      this.notify();
    });
  }

  get location() {
    return window.location;
  }

  navigate(url, {replace = false} = {}) {
    window.history[`${replace ? 'replace' : 'push'}State`](null, null, url);
    this.notify();
  }

  findRoute() {
    const url = this.location.href;

    for (const item of this.layer.getItems()) {
      if (isRoutable(item)) {
        const result = item.findRoute(url);
        if (result) {
          return {target: item, ...result};
        }
      }
    }
  }

  callRoute({fallback} = {}) {
    const result = this.findRoute();

    if (result) {
      const {target, route, params} = result;
      return target[route.name](params);
    }

    if (fallback) {
      return fallback();
    }

    throw new Error(`Route not found (URL: '${this.location.href}')`);
  }

  _applyPlugins(plugins) {
    for (const plugin of plugins) {
      plugin(this);
    }
  }
}
