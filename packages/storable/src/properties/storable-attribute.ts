import type {Component, AttributeOptions} from '@liaison/component';
import {Attribute} from '@liaison/component';
import {PromiseLikeable, hasOwnProperty, Constructor} from 'core-helpers';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property} from '@liaison/component';

import {StorablePropertyMixin, StorablePropertyOptions} from './storable-property';
import {assertIsStorableClassOrInstance} from '../utilities';

export type StorableAttributeOptions = StorablePropertyOptions &
  AttributeOptions & {
    loader?: StorableAttributeLoader;
    beforeLoad?: StorableAttributeHook;
    afterLoad?: StorableAttributeHook;
    beforeSave?: StorableAttributeHook;
    afterSave?: StorableAttributeHook;
    beforeDelete?: StorableAttributeHook;
    afterDelete?: StorableAttributeHook;
  };

export type StorableAttributeLoader = () => PromiseLikeable<unknown>;

export type StorableAttributeHook = () => PromiseLikeable<void>;

export type StorableAttributeHookName =
  | 'beforeLoad'
  | 'afterLoad'
  | 'beforeSave'
  | 'afterSave'
  | 'beforeDelete'
  | 'afterDelete';

export const StorableAttributeMixin = <T extends Constructor<typeof Attribute>>(Base: T) =>
  class extends StorablePropertyMixin(Base) {
    // === Options ===

    setOptions(options: StorableAttributeOptions = {}) {
      const {
        loader,
        beforeLoad,
        afterLoad,
        beforeSave,
        afterSave,
        beforeDelete,
        afterDelete,
        ...otherOptions
      } = options;

      if (loader !== undefined) {
        this.setLoader(loader);
      }

      if (beforeLoad !== undefined) {
        this.setHook('beforeLoad', beforeLoad);
      }

      if (afterLoad !== undefined) {
        this.setHook('afterLoad', afterLoad);
      }

      if (beforeSave !== undefined) {
        this.setHook('beforeSave', beforeSave);
      }

      if (afterSave !== undefined) {
        this.setHook('afterSave', afterSave);
      }

      if (beforeDelete !== undefined) {
        this.setHook('beforeDelete', beforeDelete);
      }

      if (afterDelete !== undefined) {
        this.setHook('afterDelete', afterDelete);
      }

      super.setOptions(otherOptions);
    }

    // === Loader ===

    _loader: StorableAttributeLoader | undefined;

    getLoader() {
      return this._loader;
    }

    hasLoader() {
      return this.getLoader() !== undefined;
    }

    setLoader(loader: StorableAttributeLoader) {
      this._loader = loader;
    }

    async callLoader() {
      const loader = this.getLoader();

      if (loader === undefined) {
        throw new Error(`Cannot call a loader that is missing (${this.describe()})`);
      }

      return await loader.call(this.getParent());
    }

    // === Hooks ===

    getHook(name: StorableAttributeHookName) {
      return this._getHooks()[name];
    }

    hasHook(name: StorableAttributeHookName) {
      return name in this._getHooks();
    }

    setHook(name: StorableAttributeHookName, hook: StorableAttributeHook) {
      this._getHooks(true)[name] = hook;
    }

    async callHook(name: StorableAttributeHookName) {
      const hook = this.getHook(name);

      if (hook === undefined) {
        throw new Error(`Cannot call a hook that is missing (${this.describe()}, hook: '${name}')`);
      }

      await hook.call(this.getParent());
    }

    _hooks!: Partial<Record<StorableAttributeHookName, StorableAttributeHook>>;

    _getHooks(autoFork = false) {
      if (this._hooks === undefined) {
        Object.defineProperty(this, '_hooks', {
          value: Object.create(null)
        });
      } else if (autoFork && !hasOwnProperty(this, '_hooks')) {
        Object.defineProperty(this, '_hooks', {
          value: Object.create(this._hooks)
        });
      }

      return this._hooks;
    }

    // === Utilities ===

    isComputed() {
      return super.isComputed() || this.hasLoader();
    }

    static isStorableAttribute(value: any): value is StorableAttribute {
      return isStorableAttributeInstance(value);
    }
  };

export function isStorableAttributeClass(value: any): value is typeof StorableAttribute {
  return typeof value?.isStorableAttribute === 'function';
}

export function isStorableAttributeInstance(value: any): value is StorableAttribute {
  return isStorableAttributeClass(value?.constructor) === true;
}

export class StorableAttribute extends StorableAttributeMixin(Attribute) {
  constructor(
    name: string,
    parent: typeof Component | Component,
    options: StorableAttributeOptions = {}
  ) {
    assertIsStorableClassOrInstance(parent);

    super(name, parent, options);
  }
}
