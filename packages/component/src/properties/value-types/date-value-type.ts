import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class DateValueType extends ValueType {
  toString() {
    return `Date${super.toString()}`;
  }

  _checkValue(value: unknown, attribute: Attribute) {
    return super._checkValue(value, attribute) ?? value instanceof Date;
  }

  static isDateValueType(value: any): value is DateValueType {
    return isDateValueTypeInstance(value);
  }
}

export function isDateValueTypeInstance(value: any): value is DateValueType {
  return typeof value?.constructor?.isDateValueType === 'function';
}
