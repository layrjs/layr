import {Field} from '@liaison/model';
import ow from 'ow';

export class StorableField extends Field {
  constructor(parent, name, type, {isUnique = false, finder, ...otherOptions} = {}) {
    ow(isUnique, ow.boolean);
    ow(finder, ow.optional.function);

    super(parent, name, type, otherOptions);

    if (isUnique) {
      if (this.isArray()) {
        throw new Error(`A unique field cannot be an array (field: '${name}')`);
      }

      if (this.getScalar().isOptional()) {
        throw new Error(`A unique field cannot be optional (field: '${name}')`);
      }

      this._isUnique = true;
    }

    this._finder = finder;
  }

  isUnique() {
    return this._isUnique;
  }

  getFinder() {
    return this._finder;
  }
}
