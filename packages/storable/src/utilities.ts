import {getTypeOf} from 'core-helpers';

import type {StorableComponent} from './storable';

/**
 * Returns whether the specified value is a storable component class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isStorableClass(value: any): value is typeof StorableComponent {
  return typeof value === 'function' && typeof value.isStorable === 'function';
}

/**
 * Returns whether the specified value is a storable component instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isStorableInstance(value: any): value is StorableComponent {
  return typeof value === 'object' && value !== null && typeof value.isStorable === 'function';
}

/**
 * Returns whether the specified value is a storable component class or instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isStorableClassOrInstance(
  value: any
): value is typeof StorableComponent | StorableComponent {
  return isStorable(value);
}

export function isStorable(value: any): value is typeof StorableComponent | StorableComponent {
  return typeof value?.isStorable === 'function';
}

/**
 * Throws an error if the specified value is not a storable component class.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsStorableClass(value: any): asserts value is typeof StorableComponent {
  if (!isStorableClass(value)) {
    throw new Error(
      `Expected a storable component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Throws an error if the specified value is not a storable component instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsStorableInstance(value: any): asserts value is StorableComponent {
  if (!isStorableInstance(value)) {
    throw new Error(
      `Expected a storable component instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

/**
 * Throws an error if the specified value is not a storable component class or instance.
 *
 * @param value A value of any type.
 *
 * @category Utilities
 */
export function assertIsStorableClassOrInstance(
  value: any
): asserts value is typeof StorableComponent | StorableComponent {
  if (!isStorableClassOrInstance(value)) {
    throw new Error(
      `Expected a storable component class or instance, but received a value of type '${getTypeOf(
        value
      )}'`
    );
  }
}

/**
 * Ensures that the specified storable component is a class. If you specify a storable component instance (or prototype), the class of the component is returned. If you specify a storable component class, it is returned as is.
 *
 * @param component A storable component class or instance.
 *
 * @returns A storable component class.
 *
 * @example
 * ```
 * ensureStorableClass(movie) => Movie
 * ensureStorableClass(Movie.prototype) => Movie
 * ensureStorableClass(Movie) => Movie
 * ```
 *
 * @category Utilities
 */
export function ensureStorableClass(storable: typeof StorableComponent | StorableComponent) {
  if (isStorableClass(storable)) {
    return storable;
  }

  if (isStorableInstance(storable)) {
    return storable.constructor as typeof StorableComponent;
  }

  throw new Error(
    `Expected a storable component class or instance, but received a value of type '${getTypeOf(
      storable
    )}'`
  );
}

/**
 * Ensures that the specified storable component is an instance (or prototype). If you specify a storable component class, the component prototype is returned. If you specify a storable component instance (or prototype), it is returned as is.
 *
 * @param component A storable component class or instance.
 *
 * @returns A storable component instance (or prototype).
 *
 * @example
 * ```
 * ensureStorableInstance(Movie) => Movie.prototype
 * ensureStorableInstance(Movie.prototype) => Movie.prototype
 * ensureStorableInstance(movie) => movie
 * ```
 *
 * @category Utilities
 */
export function ensureStorableInstance(component: typeof StorableComponent | StorableComponent) {
  if (isStorableClass(component)) {
    return component.prototype;
  }

  if (isStorableInstance(component)) {
    return component;
  }

  throw new Error(
    `Expected a storable component class or instance, but received a value of type '${getTypeOf(
      component
    )}'`
  );
}
