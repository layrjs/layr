import {Attribute} from '@liaison/component';
import ow from 'ow';

export class Field extends Attribute {
  getType() {
    return 'field';
  }

  // === Options ===

  setOptions(options = {}) {
    ow(options, 'options', ow.object.partialShape({valueType: ow.string.nonEmpty}));

    const {valueType, ...otherOptions} = options;

    super.setOptions(otherOptions);
  }

  // === Utilities ===

  static isField(object) {
    return isField(object);
  }
}

export function isField(object) {
  return typeof object?.constructor?.isField === 'function';
}
