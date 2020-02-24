import ow from 'ow';

import {Type} from './type';
import {joinFieldPath} from '../utilities';

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

  checkValue(values, options = {}) {
    ow(options, 'options', ow.object.exactShape({field: ow.object}));

    const {field} = options;

    super.checkValue(values, {field});

    if (values === undefined) {
      // `values` is undefined and isOptional() is true
      return;
    }

    const elementType = this.getElementType();

    for (const value of values) {
      elementType.checkValue(value, {field});
    }
  }

  _checkValue(values) {
    return super._checkValue(values) ?? Array.isArray(values);
  }

  runValidators(values) {
    const failedValidators = super.runValidators(values);

    if (values !== undefined) {
      const elementType = this.getElementType();

      values.forEach((value, index) => {
        const elementFailedValidators = elementType.runValidators(value);

        for (const {validator, path} of elementFailedValidators) {
          failedValidators.push({validator, path: joinFieldPath([`[${index}]`, path])});
        }
      });
    }

    return failedValidators;
  }
}
