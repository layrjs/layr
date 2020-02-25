import {Property} from './property';

export class Method extends Property {
  static isMethod(object) {
    return isMethod(object);
  }
}

export function isMethodClass(object) {
  return typeof object?.isMethod === 'function';
}

export function isMethod(object) {
  return isMethodClass(object?.constructor) === true;
}
