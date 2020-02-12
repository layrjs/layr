import {Property} from './property';

export class Method extends Property {
  getType() {
    return 'method';
  }

  static isMethod(object) {
    return isMethod(object);
  }
}

export function isMethod(object) {
  return typeof object?.constructor?.isMethod === 'function';
}
