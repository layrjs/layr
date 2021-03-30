import {getTypeOf} from 'core-helpers';

import type {RoutableComponent} from './routable';

/**
 * Returns whether the specified value is a routable component class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRoutableClass(value: any): value is typeof RoutableComponent {
  return typeof value?.isRoutable === 'function';
}

/**
 * Returns whether the specified value is a routable component class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRoutableInstance(value: any): value is RoutableComponent {
  return typeof value?.constructor?.isRoutable === 'function';
}

/**
 * Returns whether the specified value is a routable component class or instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isRoutableClassOrInstance(
  value: any
): value is typeof RoutableComponent | RoutableComponent {
  return (
    typeof value?.isRoutable === 'function' || typeof value?.constructor?.isRoutable === 'function'
  );
}

/**
 * Throws an error if the specified value is not a routable component class.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsRoutableClass(value: any): asserts value is typeof RoutableComponent {
  if (!isRoutableClass(value)) {
    throw new Error(
      `Expected a routable class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Throws an error if the specified value is not a routable component instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsRoutableInstance(value: any): asserts value is RoutableComponent {
  if (!isRoutableInstance(value)) {
    throw new Error(
      `Expected a routable component instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Throws an error if the specified value is not a routable component class or instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsRoutableClassOrInstance(
  value: any
): asserts value is typeof RoutableComponent | RoutableComponent {
  if (!isRoutableClassOrInstance(value)) {
    throw new Error(
      `Expected a routable component class or instance, but received a value of type '${getTypeOf(
        value
      )}'`
    );
  }
}
