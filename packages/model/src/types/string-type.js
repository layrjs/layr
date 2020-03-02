import {Type} from './type';

export class StringType extends Type {
  toString() {
    return `string${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? typeof value === 'string';
  }
}
