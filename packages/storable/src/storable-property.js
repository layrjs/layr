import {isIdentity} from '@liaison/identity';
import upperFirst from 'lodash/upperFirst';
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

    hasHook(name) {
      const attribute = '_' + name;
      return this[attribute] !== undefined;
    }

    async callHook(name, ...args) {
      const method = '_call' + upperFirst(name);
      return await this[method](...args);
    }

    async _callFinder(filter) {
      const name = this.getName();

      const {[name]: value, ...remainingFilter} = filter;

      if (value === undefined) {
        return remainingFilter;
      }

      let newFilter = await this._finder.call(this.getParent().constructor, value);

      if (
        isIdentity(newFilter) ||
        (Array.isArray(newFilter) && newFilter.every(item => isIdentity(item)))
      ) {
        // The finder returned an $identity shortcut
        newFilter = {$identity: newFilter};
      }

      return {...remainingFilter, ...newFilter};
    }
  };
