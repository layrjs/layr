import {Attribute} from '@liaison/component';
import {Observable, createObservable, isObservable, canBeObserved} from '@liaison/observable';
import ow from 'ow';

import {createType} from './types/factory';

export class Field extends Observable(Attribute) {
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

    this._valueType = createType(valueType, {validators, field: this});

    super.setOptions(otherOptions);
  }

  // === Value type ===

  getValueType() {
    return this._valueType;
  }

  // === Value ===

  setValue(value) {
    this.getValueType().checkValue(value, {field: this});

    if (this._setter !== undefined) {
      return super.setValue(value);
    }

    if (canBeObserved(value) && !isObservable(value)) {
      value = createObservable(value);
    }

    const {previousValue, newValue} = super.setValue(value);

    if (newValue?.valueOf() !== previousValue?.valueOf()) {
      this.callObservers();

      const parent = this.getParent();

      if (isObservable(previousValue)) {
        previousValue.removeObserver(this);
        previousValue.removeObserver(parent);
      }

      if (isObservable(newValue)) {
        newValue.addObserver(this);
        newValue.addObserver(parent);
      }

      parent.callObservers();
    }

    return {previousValue, newValue};
  }

  // === Utilities ===

  static isField(object) {
    return isField(object);
  }
}

export function isField(object) {
  return typeof object?.constructor?.isField === 'function';
}
