import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class StringValueType extends ValueType {
  toString() {
    return `string${super.toString()}`;
  }

  _checkValue(value: unknown, attribute: Attribute) {
    return super._checkValue(value, attribute) ?? typeof value === 'string';
  }

  static isStringValueType(value: any): value is StringValueType {
    return isStringValueTypeInstance(value);
  }
}

export function isStringValueTypeInstance(value: any): value is StringValueType {
  return typeof value?.constructor?.isStringValueType === 'function';
}
