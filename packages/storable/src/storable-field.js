import {Field} from '@liaison/model';

export class StorableField extends Field {
  constructor(parent, name, type, {isUnique = false, ...otherOptions} = {}) {
    super(parent, name, type, otherOptions);

    this._isUnique = isUnique;
  }

  isUnique() {
    return this._isUnique;
  }
}
