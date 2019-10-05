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

  getCurrentLocation() {
    return window.location;
  }

  navigate(url, {replace = false, reload = false} = {}) {
    if (!reload) {
      window.history[replace ? 'replaceState' : 'pushState'](null, null, url);
      this.$notify();
    } else {
      window.location[replace ? 'replace' : 'assign'](url);
    }
  }

  redirect(url) {
    this.navigate(url, {replace: true});
  }

  reload(url, {replace = false} = {}) {
    this.navigate(url, {replace, reload: true});
  }

  findRoute(url) {
    for (const item of this.$getLayer().getItems({filter: isRoutable})) {
      const result = item.$findRoute(url);
      if (result) {
        return {target: item, ...result};
      }
    }
  }

  findCurrentRoute() {
    return this.findRoute(this.getCurrentLocation());
  }

  getRoute(url) {
    const result = this.findRoute(url);

    if (!result) {
      throw new Error(`Route not found (URL: '${url}')`);
    }

    const {target, route} = result;

    return target[route.name];
  }

  getCurrentRoute() {
    return this.getRoute(this.getCurrentLocation());
  }

  callRoute(url, {fallback} = {}) {
    const result = this.findRoute(url);

    if (result) {
      const {target, route, params} = result;
      return target[route.name](params);
    }

    if (fallback) {
      return fallback();
    }

    throw new Error(`Route not found (URL: '${url}')`);
  }

  callCurrentRoute({fallback} = {}) {
    return this.callRoute(this.getCurrentLocation(), {fallback});
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
