import isPlainObject from 'lodash/isPlainObject';

import {Type} from './type';

export class ObjectType extends Type {
  toString() {
    return `object${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? isPlainObject(value);
  }

  static isObjectType(object) {
    return isObjectType(object);
  }
}

export function isObjectType(object) {
  return typeof object?.constructor?.isObjectType === 'function';
}
