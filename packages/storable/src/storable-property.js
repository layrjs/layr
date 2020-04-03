import ow from 'ow';

export const StorablePropertyMixin = Base =>
  class StorableProperty extends Base {
    // === Options ===

    setOptions(options = {}) {
      ow(options, 'options', ow.object.partialShape({finder: ow.optional.function}));

      const {finder, ...otherOptions} = options;

      this._finder = finder;

      super.setOptions(otherOptions);
    }

    // === Finder ===

    getFinder() {
      return this._finder;
    }

    hasFinder() {
      return this.getFinder() !== undefined;
    }

    setFinder(finderFunction) {
      ow(finderFunction, 'finderFunction', ow.function);

      this._finder = finderFunction;
    }

    async callFinder(...args) {
      const finder = this.getFinder();

      if (finder === undefined) {
        throw new Error(`Cannot call a finder that is missing (${this.describe()})`);
      }

      return await finder.call(this.getParent(), ...args);
    }

    // === Utilities ===

    isComputed() {
      return this.hasFinder();
    }

    static isStorableProperty(object) {
      return isStorableProperty(object);
    }
  };

export function isStorablePropertyClass(object) {
  return typeof object?.isStorableProperty === 'function';
}

export function isStorableProperty(object) {
  return isStorablePropertyClass(object?.constructor) === true;
}
