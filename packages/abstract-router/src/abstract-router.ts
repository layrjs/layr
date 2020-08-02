import {Component, assertIsComponentClass} from '@liaison/component';
import {Observable} from '@liaison/observable';
import {PlainObject, assertNoUnknownOptions} from 'core-helpers';

import {RoutableLike, isRoutableLikeClass, assertIsRoutableLikeClass} from './routable-like';
import {isRouterInstance, normalizeURL, stringifyURL, parseQuery} from './utilities';

declare global {
  interface Function {
    matchURL: (url: URL | string) => PlainObject | undefined;
    generateURL: (params?: PlainObject) => string;
    navigate: (params?: PlainObject, query?: PlainObject) => Promise<void>;
    redirect: (params?: PlainObject, query?: PlainObject) => Promise<void>;
    reload: (params?: PlainObject, query?: PlainObject) => void;
    isActive: (params?: PlainObject) => boolean;
  }
}

type RouterPlugin = (router: AbstractRouter) => void;

type CustomRouteDecorator = (method: Function) => void;

export type AbstractRouterOptions = {
  plugins?: RouterPlugin[];
};

export abstract class AbstractRouter extends Observable(Object) {
  constructor(options: AbstractRouterOptions = {}) {
    super();

    const {plugins, ...otherOptions} = options;

    assertNoUnknownOptions(otherOptions);

    if (plugins !== undefined) {
      this.applyPlugins(plugins);
    }
  }

  // === Root components ===

  _rootComponents = new Set<typeof Component>();

  registerRootComponent(rootComponent: typeof Component) {
    assertIsComponentClass(rootComponent);

    this._rootComponents.add(rootComponent);

    let routableCount = 0;

    const registerIfComponentIsRoutable = (component: typeof Component) => {
      if (isRoutableLikeClass(component)) {
        this.registerRoutable(component);
        routableCount++;
      }
    };

    registerIfComponentIsRoutable(rootComponent);

    for (const providedComponent of rootComponent.getProvidedComponents({deep: true})) {
      registerIfComponentIsRoutable(providedComponent);
    }

    if (routableCount === 0) {
      throw new Error(
        `No routable components were found from the specified root component '${rootComponent.describeComponent()}'`
      );
    }
  }

  getRootComponents() {
    return this._rootComponents.values();
  }

  // === Routables ===

  _routables = new Map<string, typeof RoutableLike>();

  getRoutable(name: string) {
    const routable = this._getRoutable(name);

    if (routable !== undefined) {
      return routable;
    }

    throw new Error(`The routable component '${name}' is not registered in the router`);
  }

  hasRoutable(name: string) {
    return this._getRoutable(name) !== undefined;
  }

  _getRoutable(name: string) {
    return this._routables.get(name);
  }

  registerRoutable(routable: typeof RoutableLike) {
    assertIsRoutableLikeClass(routable);

    if (routable.hasRouter()) {
      if (routable.getRouter() === this) {
        return;
      }

      throw new Error(
        `Cannot register a routable component that is already registered in another router (${routable.describeComponent()})`
      );
    }

    const routableName = routable.getComponentName();

    const existingRoutable = this._routables.get(routableName);

    if (existingRoutable !== undefined) {
      throw new Error(
        `A routable component with the same name is already registered (${existingRoutable.describeComponent()})`
      );
    }

    routable.__setRouter(this);

    this._routables.set(routableName, routable);
  }

  getRoutables() {
    return this._routables.values();
  }

  // === Routes ===

  findRouteByURL(url: URL | string) {
    for (const routable of this.getRoutables()) {
      const result = routable.findRouteByURL(url);

      if (result !== undefined) {
        return {routable, ...result};
      }
    }

    return undefined;
  }

  getParamsFromURL(url: URL | string) {
    const result = this.findRouteByURL(url);

    if (result === undefined) {
      throw new Error(`Couldn't find a route matching the specified URL (URL: '${url}')`);
    }

    return result.params;
  }

  callRouteByURL(url: URL | string, options: {fallback?: Function} = {}) {
    const {fallback} = options;

    const result = this.findRouteByURL(url);

    if (result !== undefined) {
      const {routable, route, params} = result;

      return routable.__callRoute(route, params);
    }

    if (fallback !== undefined) {
      return fallback();
    }

    throw new Error(`Couldn't find a route matching the specified URL (URL: '${url}')`);
  }

  // === History ===

  getCurrentURL() {
    return stringifyURL(this._getCurrentURL());
  }

  abstract _getCurrentURL(): URL;

  getCurrentParams() {
    return this.getParamsFromURL(this._getCurrentURL());
  }

  getCurrentQuery<T extends object = object>() {
    return parseQuery<T>(this._getCurrentURL().search);
  }

  callCurrentRoute(options: {fallback?: Function} = {}) {
    const {fallback} = options;

    const url = this._getCurrentURL();

    return this.callRouteByURL(url, {fallback});
  }

  // === Navigation ===

  navigate(url: string | URL) {
    const normalizedURL = normalizeURL(url);

    return defer(() => {
      this._navigate(normalizedURL);
      this.callObservers();
    });
  }

  abstract _navigate(url: URL): void;

  redirect(url: string | URL) {
    const normalizedURL = normalizeURL(url);

    return defer(() => {
      this._redirect(normalizedURL);
      this.callObservers();
    });
  }

  abstract _redirect(url: URL): void;

  reload(url?: string | URL) {
    const normalizedURL = url !== undefined ? normalizeURL(url) : undefined;

    this._reload(normalizedURL);
  }

  abstract _reload(url: URL | undefined): void;

  go(delta: number) {
    return defer(() => {
      this._go(delta);
      this.callObservers();
    });
  }

  abstract _go(delta: number): void;

  goBack() {
    return this.go(-1);
  }

  goForward() {
    return this.go(1);
  }

  getHistoryLength() {
    return this._getHistoryLength();
  }

  abstract _getHistoryLength(): number;

  Link!: (props: any) => any;

  _onChange() {
    setTimeout(() => {
      this.callObservers();
    }, 0);
  }

  // === Customization ===

  applyPlugins(plugins: RouterPlugin[]) {
    for (const plugin of plugins) {
      plugin(this);
    }
  }

  _customRouteDecorators: CustomRouteDecorator[] = [];

  addCustomRouteDecorator(decorator: CustomRouteDecorator) {
    this._customRouteDecorators.push(decorator);
  }

  applyCustomRouteDecorators(routable: typeof RoutableLike, method: Function) {
    for (const customRouteDecorator of this._customRouteDecorators) {
      customRouteDecorator.call(routable, method);
    }
  }

  // === Utilities ===

  static isRouter(value: any): value is AbstractRouter {
    return isRouterInstance(value);
  }
}

function defer(func: Function) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      try {
        func();
      } catch (error) {
        reject(error);
        return;
      }

      resolve();
    }, 0);
  });
}
