import isPlainObject from 'lodash/isPlainObject';

import {Type} from './type';

export class ObjectType extends Type {
  toString() {
    return `object${super.toString()}`;
  }

  _checkValue(value) {
    return super._checkValue(value) ?? isPlainObject(value);
  }
}
