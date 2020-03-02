import {Type} from './type';

export class NumberType extends Type {
  toString() {
    return `number${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? typeof value === 'number';
  }
}
