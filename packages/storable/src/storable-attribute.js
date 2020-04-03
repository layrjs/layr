import {ModelAttribute} from '@liaison/model';
import ow from 'ow';

import {StorablePropertyMixin} from './storable-property';

export const StorableAttributeMixin = Base =>
  class StorableAttributeMixin extends StorablePropertyMixin(Base) {
    // === Options ===

    setOptions(options = {}) {
      ow(
        options,
        'options',
        ow.object.partialShape({
          loader: ow.optional.function,
          beforeLoad: ow.optional.function,
          afterLoad: ow.optional.function,
          beforeSave: ow.optional.function,
          afterSave: ow.optional.function,
          beforeDelete: ow.optional.function,
          afterDelete: ow.optional.function
        })
      );

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

      this._loader = loader;
      this._beforeLoad = beforeLoad;
      this._afterLoad = afterLoad;
      this._beforeSave = beforeSave;
      this._afterSave = afterSave;
      this._beforeDelete = beforeDelete;
      this._afterDelete = afterDelete;

      super.setOptions(otherOptions);
    }

    // === Loader ===

    getLoader() {
      return this._loader;
    }

    hasLoader() {
      return this.getLoader() !== undefined;
    }

    setLoader(loaderFunction) {
      ow(loaderFunction, 'loaderFunction', ow.function);

      this._loader = loaderFunction;
    }

    async callLoader(...args) {
      const loader = this.getLoader();

      if (loader === undefined) {
        throw new Error(`Cannot call a loader that is missing (${this.describe()})`);
      }

      return await loader.call(this.getParent(), ...args);
    }

    // === Hooks ===

    getHook(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this[`_${name}`];
    }

    hasHook(name) {
      return this.getHook(name) !== undefined;
    }

    async callHook(name, ...args) {
      const hook = this.getHook(name);

      if (hook === undefined) {
        throw new Error(
          `Cannot call a hook that is missing (${this.describe()}, hook name: '${name}')`
        );
      }

      return await hook.call(this.getParent(), ...args);
    }

    // === Utilities ===

    isComputed() {
      return super.isComputed() || this.hasLoader();
    }

    static isStorableAttribute(object) {
      return isStorableAttribute(object);
    }
  };

export class StorableAttribute extends StorableAttributeMixin(ModelAttribute) {}

export function isStorableAttributeClass(object) {
  return typeof object?.isStorableAttribute === 'function';
}

export function isStorableAttribute(object) {
  return isStorableAttributeClass(object?.constructor) === true;
}
