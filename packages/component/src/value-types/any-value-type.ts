import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class AnyValueType extends ValueType {
  isOptional() {
    return true;
  }

  toString() {
    return 'any';
  }

  _checkValue(_value: any, _attribute: Attribute) {
    return true;
  }

  static isAnyValueType(value: any): value is AnyValueType {
    return isAnyValueTypeInstance(value);
  }
}

export function isAnyValueTypeInstance(value: any): value is AnyValueType {
  return typeof value?.constructor?.isAnyValueType === 'function';
}
