import {Attribute} from '@liaison/component';
import ow from 'ow';

import {createType} from './types/factory';

export class Field extends Attribute {
  getType() {
    return 'field';
  }

  // === Options ===

  setOptions(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({valueType: ow.string.nonEmpty, validators: ow.optional.array})
    );

    const {valueType, validators = [], ...otherOptions} = options;

    super.setOptions(otherOptions);

    this._valueType = createType(valueType, {validators, field: this});
  }

  // === Value type ===

  getValueType() {
    return this._valueType;
  }

  // === Utilities ===

  static isField(object) {
    return isField(object);
  }
}

export function isField(object) {
  return typeof object?.constructor?.isField === 'function';
}
