import {Component, Property, PropertyOptions} from '@liaison/component';
import {Query} from '@liaison/abstract-store';
import {PromiseLikeable, Constructor} from 'core-helpers';

import {assertIsStorableClassOrInstance} from '../utilities';

export type StorablePropertyOptions = PropertyOptions & {
  finder?: StorablePropertyFinder;
};

export type StorablePropertyFinder = (value: unknown) => PromiseLikeable<Query>;

export const StorablePropertyMixin = <T extends Constructor<typeof Property>>(Base: T) =>
  class extends Base {
    // === Options ===

    setOptions(options: StorablePropertyOptions = {}) {
      const {finder, ...otherOptions} = options;

      this._finder = finder;

      super.setOptions(otherOptions);
    }

    // === Finder ===

    _finder: StorablePropertyFinder | undefined;

    getFinder() {
      return this._finder;
    }

    hasFinder() {
      return this.getFinder() !== undefined;
    }

    setFinder(finder: StorablePropertyFinder) {
      this._finder = finder;
    }

    async callFinder(value: unknown) {
      const finder = this.getFinder();

      if (finder === undefined) {
        throw new Error(`Cannot call a finder that is missing (${this.describe()})`);
      }

      return await finder.call(this.getParent(), value);
    }

    // === Utilities ===

    static isStorableProperty(value: any): value is StorableProperty {
      return isStorablePropertyInstance(value);
    }
  };

export function isStorablePropertyClass(value: any): value is typeof StorableProperty {
  return typeof value?.isStorableProperty === 'function';
}

export function isStorablePropertyInstance(value: any): value is StorableProperty {
  return isStorablePropertyClass(value?.constructor) === true;
}

export class StorableProperty extends StorablePropertyMixin(Property) {
  constructor(
    name: string,
    parent: typeof Component | Component,
    options: StorablePropertyOptions = {}
  ) {
    assertIsStorableClassOrInstance(parent);

    super(name, parent, options);
  }
}
