import {isRoutableClass, normalizeURL, stringifyURL} from '@liaison/routable';
import {Observable} from '@liaison/observable';
import {getTypeOf} from 'core-helpers';
import ow from 'ow';

import {isRouter} from './utilities';

export class AbstractRouter extends Observable() {
  constructor(routables, options = {}) {
    ow(routables, 'routables', ow.optional.array);
    ow(options, 'options', ow.object.exactShape({plugins: ow.optional.array}));

    super();

    const {plugins} = options;

    this._routables = Object.create(null);

    if (routables !== undefined) {
      for (const Routable of routables) {
        this.registerRoutable(Routable);
      }
    }

    this._customRouteDecorators = [];

    if (plugins !== undefined) {
      this._applyPlugins(plugins);
    }
  }

  static create(routables, options) {
    return new this(routables, options);
  }

  // === Routable registration ===

  getRoutable(name, options = {}) {
    ow(name, ow.string.nonEmpty);
    ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

    const {throwIfMissing = true} = options;

    const Routable = this._routables[name];

    if (Routable !== undefined) {
      return Routable;
    }

    if (throwIfMissing) {
      throw new Error(`The routable class '${name}' is not registered in the router`);
    }
  }

  registerRoutable(Routable) {
    if (!isRoutableClass(Routable)) {
      throw new Error(
        `Expected a routable class, but received a value of type '${getTypeOf(Routable)}'`
      );
    }

    if (Routable.hasRouter()) {
      throw new Error(
        `Cannot register a routable that is already registered (${Routable.describeComponent()})`
      );
    }

    const routableName = Routable.getComponentName();

    const existingRoutable = this._routables[routableName];

    if (existingRoutable !== undefined) {
      throw new Error(
        `A routable with the same name is already registered (${existingRoutable.describeComponent()})`
      );
    }

    Routable.__setRouter(this);

    this._routables[routableName] = Routable;
  }

  getRoutables() {
    return Object.values(this._routables);
  }

  // === Routes ===

  findRouteForURL(url) {
    const normalizedURL = normalizeURL(url);

    for (const Routable of this.getRoutables()) {
      const result = Routable.findRouteForURL(normalizedURL);

      if (result !== undefined) {
        return {Routable, ...result};
      }
    }
  }

  getParamsForURL(url) {
    const normalizedURL = normalizeURL(url);

    const result = this.findRouteForURL(normalizedURL);

    if (result === undefined) {
      throw new Error(`Cannot find a route matching the specified URL (URL: '${url}')`);
    }

    const {params} = result;

    return params;
  }

  callRouteForURL(url, options = {}) {
    ow(options, 'options', ow.object.exactShape({fallback: ow.optional.function}));

    const normalizedURL = normalizeURL(url);

    const {fallback} = options;

    const result = this.findRouteForURL(normalizedURL);

    if (result !== undefined) {
      const {Routable, route, params} = result;

      return Routable.__callRoute(route, params);
    }

    if (fallback !== undefined) {
      return fallback();
    }

    throw new Error(`Cannot find a route matching the specified URL (URL: '${url}')`);
  }

  // === History ===

  getCurrentURL() {
    return stringifyURL(this._getCurrentURL());
  }

  getCurrentParams() {
    const url = this._getCurrentURL();

    return this.getParamsForURL(url);
  }

  callCurrentRoute(options = {}) {
    ow(options, 'options', ow.object.exactShape({fallback: ow.optional.function}));

    const {fallback} = options;

    const url = this._getCurrentURL();

    return this.callRouteForURL(url, {fallback});
  }

  // === Navigation ===

  navigate(url) {
    const normalizedURL = normalizeURL(url);

    this._navigate(normalizedURL);
  }

  redirect(url) {
    const normalizedURL = normalizeURL(url);

    this._redirect(normalizedURL);
  }

  go(delta) {
    ow(delta, 'delta', ow.number.integer);

    this._go(delta);
  }

  goBack() {
    this._go(-1);
  }

  goForward() {
    this._go(1);
  }

  getHistoryLength() {
    return this._getHistoryLength();
  }

  // === Customization ===

  addCustomRouteDecorator(decorator) {
    this._customRouteDecorators.push(decorator);
  }

  applyCustomRouteDecorators(Routable, method) {
    for (const customRouteDecorator of this._customRouteDecorators) {
      customRouteDecorator.call(Routable, method);
    }
  }

  _applyPlugins(plugins) {
    for (const plugin of plugins) {
      plugin(this);
    }
  }

  // === Utilities ===

  static isRouter(object) {
    return isRouter(object);
  }
}
