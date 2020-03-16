import {Attribute, AttributeSelector, getHumanTypeOf} from '@liaison/component';
import {Observable, createObservable, isObservable, canBeObserved} from '@liaison/observable';
import ow from 'ow';

import {createType, unintrospectType} from './types/factory';

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

    const {previousValue} = super.unsetValue();

    this.callObservers();

    const parent = this.getParent();

    if (isObservable(previousValue)) {
      previousValue.removeObserver(this);
      previousValue.removeObserver(parent);
    }

    parent.callObservers();

    return {previousValue};
  }

  // Attribute selectors

  _expandAttributeSelector(normalizedAttributeSelector, options) {
    return this.getType()._expandAttributeSelector(normalizedAttributeSelector, {
      ...options,
      modelAttribute: this
    });
  }

  // === Validation ===

  validate(attributeSelector = true) {
    attributeSelector = AttributeSelector.normalize(attributeSelector);

    const failedValidators = this.runValidators(attributeSelector);

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    const error = Object.assign(
      new Error(
        `The following error(s) occurred while validating the ${getHumanTypeOf(
          this
        )} '${this.getName()}': ${details}`
      ),
      {failedValidators}
    );

    throw error;
  }

  isValid(attributeSelector = true) {
    attributeSelector = AttributeSelector.normalize(attributeSelector);

    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  runValidators(attributeSelector = true) {
    if (!this.isSet()) {
      throw new Error(
        `Cannot run the validators of an unset ${getHumanTypeOf(this)} (${this.describe()})`
      );
    }

    const failedValidators = this.getType().runValidators(this.getValue(), attributeSelector);

    return failedValidators;
  }

  // === Introspection ===

  introspect() {
    const introspectedModelAttribute = super.introspect();

    if (introspectedModelAttribute === undefined) {
      return undefined;
    }

    Object.assign(introspectedModelAttribute, this.getType().introspect());

    return introspectedModelAttribute;
  }

  static unintrospect(introspectedModelAttribute) {
    ow(
      introspectedModelAttribute,
      'introspectedModelAttribute',
      ow.object.partialShape({
        valueType: ow.string.nonEmpty,
        validators: ow.optional.array,
        items: ow.optional.object
      })
    );

    const {
      valueType,
      validators: introspectedValidators,
      items: introspectedItems,
      ...introspectedAttribute
    } = introspectedModelAttribute;

    const {name, options} = super.unintrospect(introspectedAttribute);

    const {type, validators, items} = unintrospectType({
      valueType,
      validators: introspectedValidators,
      items: introspectedItems
    });

    Object.assign(options, {type, validators, items});

    return {name, options};
  }

  // === Utilities ===

  static isModelAttribute(object) {
    return isModelAttribute(object);
  }
}

ModelAttribute.humanName = 'Attribute';

export function isModelAttributeClass(object) {
  return typeof object?.isModelAttribute === 'function';
}

export function isModelAttribute(object) {
  return isModelAttributeClass(object?.constructor) === true;
}
