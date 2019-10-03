import {Registerable} from '@liaison/layer';
import {Observable} from '@liaison/observable';

import {isRoutable} from './routable';

export class BrowserRouter extends Observable(Registerable()) {
  constructor({plugins} = {}) {
    super();

    this._customRouteDecorators = [];

    if (plugins !== undefined) {
      this._applyPlugins(plugins);
    }

    window.addEventListener('popstate', () => {
      this.$notify();
    });
  }

  get location() {
    return window.location;
  }

  navigate(url, {replace = false} = {}) {
    window.history[`${replace ? 'replace' : 'push'}State`](null, null, url);
    this.$notify();
  }

  redirect(url) {
    this.navigate(url, {replace: true});
  }

  findRoute() {
    const url = this.location.href;

    for (const item of this.$getLayer().getItems({filter: isRoutable})) {
      const result = item.$findRoute(url);
      if (result) {
        return {target: item, ...result};
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

  addCustomRouteDecorator(decorator) {
    this._customRouteDecorators.push(decorator);
  }

  applyCustomRouteDecorators(target, func) {
    for (const customRouteDecorator of this._customRouteDecorators) {
      customRouteDecorator.call(target, func);
    }
  }

  _applyPlugins(plugins) {
    for (const plugin of plugins) {
      plugin(this);
    }
  }
}
