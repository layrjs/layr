import {getTypeOf} from 'core-helpers';

import type {Storable} from './storable';

export function isStorableClass(value: any): value is typeof Storable {
  return typeof value?.isStorable === 'function';
}

export function isStorableInstance(value: any): value is Storable {
  return typeof value?.constructor?.isStorable === 'function';
}

export function isStorableClassOrInstance(value: any): value is typeof Storable | Storable {
  return (
    typeof value?.isStorable === 'function' || typeof value?.constructor?.isStorable === 'function'
  );
}

export function assertIsStorableClass(value: any): asserts value is typeof Storable {
  if (!isStorableClass(value)) {
    throw new Error(
      `Expected a storable component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function assertIsStorableInstance(value: any): asserts value is Storable {
  if (!isStorableInstance(value)) {
    throw new Error(
      `Expected a storable component instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}

export function assertIsStorableClassOrInstance(
  value: any
): asserts value is typeof Storable | Storable {
  if (!isStorableClassOrInstance(value)) {
    throw new Error(
      `Expected a storable component class or instance, but received a value of type '${getTypeOf(
        value
      )}'`
    );
  }
}

export function ensureStorableClass(storable: typeof Storable | Storable) {
  if (isStorableClass(storable)) {
    return storable;
  }

  if (isStorableInstance(storable)) {
    return storable.constructor as typeof Storable;
  }

  throw new Error(
    `Expected a storable component class or instance, but received a value of type '${getTypeOf(
      storable
    )}'`
  );
}

export function ensureStorableInstance(component: typeof Storable | Storable) {
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
