import {Type} from './type';

export class BooleanType extends Type {
  toString() {
    return `boolean${super.toString()}`;
  }

  _checkValue(value) {
    return super._checkValue(value) ?? typeof value === 'boolean';
  }
}
