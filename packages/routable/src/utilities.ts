import {getTypeOf} from 'core-helpers';

import type {RoutableComponent} from './routable';
import type {Route} from './route';

export function isRoutableClass(value: any): value is typeof RoutableComponent {
  return typeof value?.isRoutable === 'function';
}

export function isRoutableInstance(value: any): value is RoutableComponent {
  return typeof value?.constructor?.isRoutable === 'function';
}

export function assertIsRoutableClass(value: any): asserts value is typeof RoutableComponent {
  if (!isRoutableClass(value)) {
    throw new Error(
      `Expected a routable class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function isRouteClass(value: any): value is typeof Route {
  return typeof value?.isRoute === 'function';
}

export function isRouteInstance(value: any): value is Route {
  return typeof value?.constructor?.isRoute === 'function';
}
