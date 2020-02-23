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

    if (this._getter !== undefined) {
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

  unsetValue() {
    if (!this.hasValue()) {
      return;
    }

    const previousValue = this.getValue();

    super.unsetValue();

    this.callObservers();

    const parent = this.getParent();

    if (isObservable(previousValue)) {
      previousValue.removeObserver(this);
      previousValue.removeObserver(parent);
    }

    parent.callObservers();
  }

  // === Validation ===

  runValidators() {
    if (!this.hasValue()) {
      throw new Error(
        `Cannot run the validators of an unset ${this.getType()} (${this.getType()} name: '${this.getName()}')`
      );
    }

    return this.getValueType().runValidators(this.getValue());
  }

  // === Utilities ===

  static isField(object) {
    return isField(object);
  }
}

export function isField(object) {
  return typeof object?.constructor?.isField === 'function';
}
