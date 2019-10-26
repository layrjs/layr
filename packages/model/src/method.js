import {Property} from '@liaison/layer';

export class Method extends Property {
  constructor(parent, name, options = {}) {
    const {...unknownOptions} = options;

    super(parent, name, unknownOptions);

    this._options = options;
  }

  static isMethod(object) {
    return isMethod(object);
  }
}

export function isMethod(object) {
  return typeof object?.constructor?.isMethod === 'function';
}
