import ow from 'ow';

import {Type} from './type';
import {joinFieldPath} from '../utilities';

export class ArrayType extends Type {
  constructor(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        itemType: ow.object.instanceOf(Type)
      })
    );

    const {itemType, ...otherOptions} = options;

    super(otherOptions);

    this._itemType = itemType;
  }

  getItemType() {
    return this._itemType;
  }

  toString() {
    return `[${this.getItemType().toString()}]${super.toString()}`;
  }

  checkValue(values, options = {}) {
    ow(options, 'options', ow.object.exactShape({field: ow.object}));

    const {field} = options;

    super.checkValue(values, {field});

    if (values === undefined) {
      // `values` is undefined and isOptional() is true
      return;
    }

    const itemType = this.getItemType();

    for (const value of values) {
      itemType.checkValue(value, {field});
    }
  }

  _checkValue(values, options) {
    return super._checkValue(values, options) ?? Array.isArray(values);
  }

  _expandAttributeSelector(normalizedAttributeSelector, options) {
    return this.getItemType()._expandAttributeSelector(normalizedAttributeSelector, options);
  }

  runValidators(values) {
    const failedValidators = super.runValidators(values);

    if (values !== undefined) {
      const itemType = this.getItemType();

      values.forEach((value, index) => {
        const failedItemValidators = itemType.runValidators(value);

        for (const {validator, path} of failedItemValidators) {
          failedValidators.push({validator, path: joinFieldPath([`[${index}]`, path])});
        }
      });
    }

    return failedValidators;
  }
}
