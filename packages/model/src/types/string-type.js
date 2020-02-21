import {Type} from './type';

export class StringType extends Type {
  toString() {
    return `string${super.toString()}`;
  }

  _checkValue(value) {
    return super._checkValue(value) ?? typeof value === 'string';
  }
}
