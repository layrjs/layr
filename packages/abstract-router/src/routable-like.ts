import {PlainObject, getTypeOf} from 'core-helpers';

import type {AbstractRouter} from './abstract-router';

export declare class RoutableLike {
  static getComponentName: () => string;

  static describeComponent: () => string;

  static getRouter: () => AbstractRouter;

  static hasRouter: () => boolean;

  static __setRouter: (router: AbstractRouter) => void;

  static findRouteForURL: (url: string | URL) => {route: any; params: PlainObject} | undefined;

  static __callRoute: (route: any, params: any) => any;
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
