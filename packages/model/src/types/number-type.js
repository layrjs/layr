import {Type} from './type';

export class NumberType extends Type {
  toString() {
    return `number${super.toString()}`;
  }

  _checkValue(value) {
    return super._checkValue(value) ?? typeof value === 'number';
  }
}
