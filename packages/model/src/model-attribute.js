import {Attribute, getTypeOf} from '@liaison/component';
import {Observable, createObservable, isObservable, canBeObserved} from '@liaison/observable';
import ow from 'ow';

import {createType} from './types/factory';

export class ModelAttribute extends Observable(Attribute) {
  // === Options ===

  setOptions(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        type: ow.string.nonEmpty,
        validators: ow.optional.array,
        items: ow.optional.object
      })
    );

    const {type, validators = [], items, ...otherOptions} = options;

    this._type = createType(type, {validators, items, modelAttribute: this});

    super.setOptions(otherOptions);
  }

  // === Value type ===

  getType() {
    return this._type;
  }

  // === Value ===

  setValue(value) {
    this.getType().checkValue(value, {modelAttribute: this});

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
    if (!this.isSet()) {
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

  // Attribute selectors

  _expandAttributeSelector(normalizedAttributeSelector, options) {
    return this.getType()._expandAttributeSelector(normalizedAttributeSelector, {
      ...options,
      modelAttribute: this
    });
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
    if (!this.isSet()) {
      throw new Error(
        `Cannot run the validators of an unset ${getTypeOf(this)} (${getTypeOf(
          this
        )} name: '${this.getName()}')`
      );
    }

    const failedValidators = this.getType().runValidators(this.getValue());

    return failedValidators;
  }

  // === Utilities ===

  static isModelAttribute(object) {
    return isModelAttribute(object);
  }
}

export function isModelAttributeClass(object) {
  return typeof object?.isModelAttribute === 'function';
}

export function isModelAttribute(object) {
  return isModelAttributeClass(object?.constructor) === true;
}
