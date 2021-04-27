import {getTypeOf} from 'core-helpers';

import type {Router} from './router';

export declare class RoutableLike {
  static getComponentName: () => string;

  static getComponentType: () => string;

  getComponentType: () => string;

  static describeComponent: () => string;

  describeComponent: () => string;

  static getRouter: () => Router;

  static hasRouter: () => boolean;

  static __setRouter: (router: Router) => void;

  static findRouteByURL: (
    url: URL | string
  ) => {route: any; identifiers: any; params: any} | undefined;

  findRouteByURL: (url: URL | string) => {route: any; identifiers: any; params: any} | undefined;

  static __callRoute: (route: any, identifiers: any, params: any) => any;

  __callRoute: (route: any, identifiers: any, params: any) => any;
}

export function isRoutableLikeClass(value: any): value is typeof RoutableLike {
  return typeof value?.isRoutable === 'function';
}

export function assertIsRoutableLikeClass(value: any): asserts value is typeof RoutableLike {
  if (!isRoutableLikeClass(value)) {
    throw new Error(
      `Expected a routable component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}
