import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class RegExpValueType extends ValueType {
  toString() {
    return `RegExp${super.toString()}`;
  }

  _checkValue(value: unknown, attribute: Attribute) {
    return super._checkValue(value, attribute) ?? value instanceof RegExp;
  }

  static isRegExpValueType(value: any): value is RegExpValueType {
    return isRegExpValueTypeInstance(value);
  }
}

export function isRegExpValueTypeInstance(value: any): value is RegExpValueType {
  return typeof value?.constructor?.isRegExpValueType === 'function';
}
