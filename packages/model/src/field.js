import {Attribute, getTypeOf} from '@liaison/component';
import {Observable, createObservable, isObservable, canBeObserved} from '@liaison/observable';
import ow from 'ow';

import {createType} from './types/factory';

export class Field extends Observable(Attribute) {
  // === Options ===

  setOptions(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        valueType: ow.string.nonEmpty,
        validators: ow.optional.array,
        items: ow.optional.object
      })
    );

    const {valueType, validators = [], items, ...otherOptions} = options;

    this._valueType = createType(valueType, {validators, items, field: this});

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

  validate() {
    const failedValidators = this.runValidators();

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    const error = Object.assign(
      new Error(
        `The following error(s) occurred while validating the ${getTypeOf(
          this
        )} '${this.getName()}': ${details}`
      ),
      {failedValidators}
    );

    throw error;
  }

  isValid() {
    const failedValidators = this.runValidators();

    return failedValidators.length === 0;
  }

  runValidators() {
    if (!this.hasValue()) {
      throw new Error(
        `Cannot run the validators of an unset ${getTypeOf(this)} (${getTypeOf(
          this
        )} name: '${this.getName()}')`
      );
    }

    const failedValidators = this.getValueType().runValidators(this.getValue());

    return failedValidators;
  }

  // === Utilities ===

  static isField(object) {
    return isField(object);
  }
}

export function isFieldClass(object) {
  return typeof object?.isField === 'function';
}

export function isField(object) {
  return isFieldClass(object?.constructor) === true;
}
