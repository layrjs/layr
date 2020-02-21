import ow from 'ow';

import {Type} from './type';

export class ArrayType extends Type {
  constructor(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        elementType: ow.object.instanceOf(Type)
      })
    );

    const {elementType, ...otherOptions} = options;

    super(otherOptions);

    this._elementType = elementType;
  }

  getElementType() {
    return this._elementType;
  }

  toString() {
    return `[${this.getElementType().toString()}]${super.toString()}`;
  }

  checkValue(value, options = {}) {
    ow(options, 'options', ow.object.exactShape({field: ow.object}));

    const {field} = options;

    super.checkValue(value, {field});

    if (value === undefined) {
      // The value is undefined and isOptional() is true
      return;
    }

    const values = value;
    const elementType = this.getElementType();

    for (const value of values) {
      elementType.checkValue(value, {field});
    }
  }

  _checkValue(value) {
    return super._checkValue(value) ?? Array.isArray(value);
  }
}
