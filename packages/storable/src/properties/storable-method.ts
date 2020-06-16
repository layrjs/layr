import {Component, Method} from '@liaison/component';
import {Constructor} from 'core-helpers';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property} from '@liaison/component';

import {StorablePropertyMixin, StorablePropertyOptions} from './storable-property';
import {assertIsStorableClassOrInstance} from '../utilities';

export type StorableMethodOptions = StorablePropertyOptions;

export const StorableMethodMixin = <T extends Constructor<typeof Method>>(Base: T) =>
  class extends StorablePropertyMixin(Base) {
    _storableMethodBrand!: void;

    static isStorableMethod(value: any): value is StorableMethod {
      return isStorableMethodInstance(value);
    }
  };

export function isStorableMethodClass(value: any): value is typeof StorableMethod {
  return typeof value?.isStorableMethod === 'function';
}

export function isStorableMethodInstance(value: any): value is StorableMethod {
  return isStorableMethodClass(value?.constructor) === true;
}

export class StorableMethod extends StorableMethodMixin(Method) {
  constructor(
    name: string,
    parent: typeof Component | Component,
    options: StorableMethodOptions = {}
  ) {
    assertIsStorableClassOrInstance(parent);

    super(name, parent, options);
  }
}
