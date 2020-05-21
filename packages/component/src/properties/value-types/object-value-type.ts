import isPlainObject from 'lodash/isPlainObject';

import {ValueType} from './value-type';
import type {Attribute} from '../attribute';

export class ObjectValueType extends ValueType {
  toString() {
    return `object${super.toString()}`;
  }

  _checkValue(value: any, attribute: Attribute) {
    return super._checkValue(value, attribute) ?? isPlainObject(value);
  }

  static isObjectValueType(value: any): value is ObjectValueType {
    return isObjectValueTypeInstance(value);
  }
}

export function isObjectValueTypeInstance(value: any): value is ObjectValueType {
  return typeof value?.constructor?.isObjectValueType === 'function';
}
