import {Field} from '@liaison/model';

import {StorableProperty} from './storable-property';

export class StorableField extends StorableProperty(Field) {
  constructor(parent, name, options = {}) {
    const {isVolatile = false, ...unknownOptions} = options;

    super(parent, name, unknownOptions);

    this._options = options;

    this._isVolatile = isVolatile;
  }

  isVolatile() {
    return this._isVolatile;
  }
}
