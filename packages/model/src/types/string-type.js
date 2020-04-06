import {Type} from './type';

export class StringType extends Type {
  toString() {
    return `string${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? typeof value === 'string';
  }

  static isStringType(object) {
    return isStringType(object);
  }
}

export function isStringType(object) {
  return typeof object?.constructor?.isStringType === 'function';
}
