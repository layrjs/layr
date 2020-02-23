import {Type} from './type';

export class DateType extends Type {
  toString() {
    return `date${super.toString()}`;
  }

  _checkValue(value) {
    return super._checkValue(value) ?? value instanceof Date;
  }
}
