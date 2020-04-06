import {Type} from './type';

export class RegExpType extends Type {
  toString() {
    return `regExp${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? value instanceof RegExp;
  }

  static isRegExpType(object) {
    return isRegExpType(object);
  }
}

export function isRegExpType(object) {
  return typeof object?.constructor?.isRegExpType === 'function';
}
