import {Type} from './type';

export class BooleanType extends Type {
  toString() {
    return `boolean${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? typeof value === 'boolean';
  }

  static isBooleanType(object) {
    return isBooleanType(object);
  }
}

export function isBooleanType(object) {
  return typeof object?.constructor?.isBooleanType === 'function';
}
