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
          beforeLoad: ow.optional.function,
          afterLoad: ow.optional.function,
          beforeSave: ow.optional.function,
          afterSave: ow.optional.function,
          beforeDelete: ow.optional.function,
          afterDelete: ow.optional.function
        })
      );

      const {
        beforeLoad,
        afterLoad,
        beforeSave,
        afterSave,
        beforeDelete,
        afterDelete,
        ...otherOptions
      } = options;

      this._beforeLoad = beforeLoad;
      this._afterLoad = afterLoad;
      this._beforeSave = beforeSave;
      this._afterSave = afterSave;
      this._beforeDelete = beforeDelete;
      this._afterDelete = afterDelete;

      super.setOptions(otherOptions);
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
