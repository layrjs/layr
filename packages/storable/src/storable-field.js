import {Field} from '@liaison/model';
import ow from 'ow';

import {StorableProperty} from './storable-property';

export class StorableField extends StorableProperty(Field) {
  constructor(parent, name, options = {}) {
    const {isUnique = false, isVolatile = false, ...unknownOptions} = options;

    super(parent, name, unknownOptions);

    this._options = options;

    ow(isUnique, ow.boolean);

    if (isUnique) {
      if (this.isArray()) {
        throw new Error(`A unique field cannot be an array (field: '${name}')`);
      }

      if (this.getScalar().isOptional()) {
        throw new Error(`A unique field cannot be optional (field: '${name}')`);
      }
    }

    this._isUnique = isUnique;

    this._isVolatile = isVolatile;
  }

  isUnique() {
    return this._isUnique;
  }

  isVolatile() {
    return this._isVolatile;
  }
}
