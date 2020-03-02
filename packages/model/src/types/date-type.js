import {Type} from './type';

export class DateType extends Type {
  toString() {
    return `date${super.toString()}`;
  }

  _checkValue(value, options) {
    return super._checkValue(value, options) ?? value instanceof Date;
  }
}
