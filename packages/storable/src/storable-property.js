import ow from 'ow';

export const StorableProperty = Base =>
  class StorableProperty extends Base {
    constructor(parent, name, options = {}) {
      const {finder, ...unknownOptions} = options;

      super(parent, name, unknownOptions);

      this._options = options;

      ow(finder, ow.optional.function);

      this._finder = finder;
    }

    getFinder() {
      return this._finder;
    }
  };
