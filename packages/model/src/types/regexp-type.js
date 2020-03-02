import {Type} from './type';

export class RegExpType extends Type {
  toString() {
    return `regExp${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? value instanceof RegExp;
  }
}
