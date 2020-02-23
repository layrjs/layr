import {Type} from './type';

export class RegExpType extends Type {
  toString() {
    return `regExp${super.toString()}`;
  }

  _checkValue(value) {
    return super._checkValue(value) ?? value instanceof RegExp;
  }
}
