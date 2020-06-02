import {getTypeOf} from 'core-helpers';

import type {StorableComponent} from './storable';

export function isStorableClass(value: any): value is typeof StorableComponent {
  return typeof value?.isStorable === 'function';
}

export function isStorableInstance(value: any): value is StorableComponent {
  return typeof value?.constructor?.isStorable === 'function';
}

export function isStorableClassOrInstance(
  value: any
): value is typeof StorableComponent | StorableComponent {
  return (
    typeof value?.isStorable === 'function' || typeof value?.constructor?.isStorable === 'function'
  );
}

export function assertIsStorableClass(value: any): asserts value is typeof StorableComponent {
  if (!isStorableClass(value)) {
    throw new Error(
      `Expected a storable component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function assertIsStorableInstance(value: any): asserts value is StorableComponent {
  if (!isStorableInstance(value)) {
    throw new Error(
      `Expected a storable component instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

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
