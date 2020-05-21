import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class BooleanValueType extends ValueType {
  toString() {
    return `boolean${super.toString()}`;
  }

  _checkValue(value: any, attribute: Attribute) {
    return super._checkValue(value, attribute) ?? typeof value === 'boolean';
  }

  static isBooleanValueType(value: any): value is BooleanValueType {
    return isBooleanValueTypeInstance(value);
  }
}

export function isBooleanValueTypeInstance(value: any): value is BooleanValueType {
  return typeof value?.constructor?.isBooleanValueType === 'function';
}
