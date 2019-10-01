import {Field} from '@liaison/model';

export class StorableField extends Field {
  constructor(parent, name, type, {isUnique = false, ...otherOptions} = {}) {
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
  }

  isUnique() {
    return this._isUnique;
  }
}
