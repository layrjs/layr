import {Type} from './type';

export class DateType extends Type {
  toString() {
    return `date${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? value instanceof Date;
  }

  static isDateType(object) {
    return isDateType(object);
  }
}

export function isDateType(object) {
  return typeof object?.constructor?.isDateType === 'function';
}
