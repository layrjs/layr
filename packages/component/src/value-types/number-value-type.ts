import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class NumberValueType extends ValueType {
  toString() {
    return `number${super.toString()}`;
  }

  _checkValue(value: any, attribute: Attribute) {
    return super._checkValue(value, attribute) ?? typeof value === 'number';
  }

  static isNumberValueType(value: any): value is NumberValueType {
    return isNumberValueTypeInstance(value);
  }
}

export function isNumberValueTypeInstance(value: any): value is NumberValueType {
  return typeof value?.constructor?.isNumberValueType === 'function';
}
