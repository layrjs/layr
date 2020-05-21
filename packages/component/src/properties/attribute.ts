import {hasOwnProperty} from 'core-helpers';
import {Observable, createObservable, isObservable, canBeObserved} from '@liaison/observable';

import type {Component, ExpandAttributeSelectorOptions} from '../component';
import {Property, PropertyOptions} from './property';
import {ValueType, createValueType} from './value-types';
import {fork} from '../forking';
import {AttributeSelector} from './attribute-selector';
import type {Validator, ValidatorFunction} from '../validation';
import {isComponentClass} from '../utilities';

export type AttributeOptions = PropertyOptions & {
  valueType?: string;
  value?: any;
  default?: any;
  validators?: (Validator | ValidatorFunction)[];
  items?: AttributeItemsOptions;
  getter?: (this: any) => any;
  setter?: (this: any, value: any) => void;
};

type AttributeItemsOptions = {
  validators?: (Validator | ValidatorFunction)[];
  items?: AttributeItemsOptions;
};

export class Attribute extends Observable(Property) {
  constructor(name: string, parent: typeof Component | Component, options: AttributeOptions = {}) {
    super(name, parent, options);
  }

  // === Options ===

  private _getter?: () => any;
  private _setter?: (value: any) => void;

  setOptions(options: AttributeOptions = {}) {
    const {
      valueType,
      value: initialValue,
      default: defaultValue,
      validators,
      items,
      getter,
      setter,
      ...otherOptions
    } = options;

    const hasInitialValue = 'value' in options;
    const hasDefaultValue = 'default' in options;

    super.setOptions(otherOptions);

    this._valueType = createValueType(valueType, this, {validators, items});

    if (getter !== undefined || setter !== undefined) {
      if (hasInitialValue) {
        throw new Error(
          `An attribute cannot have both a getter or setter and an initial value (${this.describe()})`
        );
      }

      if (hasDefaultValue) {
        throw new Error(
          `An attribute cannot have both a getter or setter and a default value (${this.describe()})`
        );
      }

      if (getter !== undefined) {
        this._getter = getter;
      }

      if (setter !== undefined) {
        if (getter === undefined) {
          throw new Error(
            `An attribute cannot have a setter without a getter (${this.describe()})`
          );
        }
        this._setter = setter;
      }

      this._isSet = true;

      return;
    }

    if (hasInitialValue) {
      this.setValue(initialValue);
    }

    if (hasDefaultValue) {
      this._default = defaultValue;
    }
  }

  // === Value type ===

  private _valueType!: ValueType;

  getValueType() {
    return this._valueType;
  }

  // === Value ===

  private _value?: any;
  private _isSet?: boolean;

  getValue(options: {throwIfUnset?: boolean; autoFork?: boolean} = {}) {
    const {throwIfUnset = true, autoFork = true} = options;

    if (!this.isSet()) {
      if (throwIfUnset) {
        throw new Error(`Cannot get the value of an unset attribute (${this.describe()})`);
      }
      return undefined;
    }

    if (this._getter !== undefined) {
      return this._getter.call(this.getParent());
    }

    if (autoFork && !hasOwnProperty(this, '_value')) {
      const parent = this.getParent();

      let forkedValue = fork(this._value, {parentComponent: parent});

      if (canBeObserved(forkedValue)) {
        if (!isObservable(forkedValue)) {
          forkedValue = createObservable(forkedValue);
        }

        forkedValue.addObserver(this);
        forkedValue.addObserver(parent);
      }

      this._value = forkedValue;
    }

    return this._value;
  }

  setValue(value: any) {
    this.checkValue(value);

    if (this._setter !== undefined) {
      this._setter.call(this.getParent(), value);
      return;
    }

    if (this._getter !== undefined) {
      throw new Error(
        `Cannot set the value of an attribute that has a getter but no setter (${this.describe()})`
      );
    }

    if (canBeObserved(value) && !isObservable(value)) {
      value = createObservable(value);
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = value;
    this._isSet = true;

    if (value?.valueOf() !== previousValue?.valueOf()) {
      this.callObservers();

      const parent = this.getParent();

      if (isObservable(previousValue)) {
        previousValue.removeObserver(this);
        previousValue.removeObserver(parent);
      }

      if (isObservable(value)) {
        value.addObserver(this);
        value.addObserver(parent);
      }

      parent.callObservers();
    }

    return {previousValue, newValue: value};
  }

  unsetValue() {
    if (this._getter !== undefined) {
      throw new Error(
        `Cannot unset the value of an attribute that has a getter (${this.describe()})`
      );
    }

    if (this._isSet !== true) {
      return;
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = undefined;
    this._isSet = false;

    this.callObservers();

    const parent = this.getParent();

    if (isObservable(previousValue)) {
      previousValue.removeObserver(this);
      previousValue.removeObserver(parent);
    }

    parent.callObservers();

    return {previousValue};
  }

  isSet() {
    return this._isSet === true;
  }

  checkValue(value: any) {
    return this.getValueType().checkValue(value, this);
  }

  // === Default value ===

  private _default?: any;

  getDefault() {
    return this._default;
  }

  evaluateDefault() {
    let value = this._default;

    if (typeof value === 'function' && !isComponentClass(value)) {
      value = value.call(this.getParent());
    }

    return value;
  }

  // === Attribute selectors ===

  _expandAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    options: ExpandAttributeSelectorOptions
  ) {
    return this.getValueType()._expandAttributeSelector(normalizedAttributeSelector, this, options);
  }

  // === Validation ===

  validate(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    const error = Object.assign(
      new Error(
        `The following error(s) occurred while validating the attribute '${this.getName()}': ${details}`
      ),
      {failedValidators}
    );

    throw error;
  }

  isValid(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  runValidators(attributeSelector: AttributeSelector = true) {
    if (!this.isSet()) {
      throw new Error(`Cannot run the validators of an unset attribute (${this.describe()})`);
    }

    const failedValidators = this.getValueType().runValidators(this.getValue(), attributeSelector);

    return failedValidators;
  }

  // // === Introspection ===

  // introspect() {
  //   const introspectedAttribute = super.introspect();

  //   if (introspectedAttribute === undefined) {
  //     return undefined;
  //   }

  //   const exposure = this.getExposure();
  //   const getIsExposed = exposure !== undefined ? hasOwnProperty(exposure, 'get') : false;

  //   if (getIsExposed && this.isSet()) {
  //     introspectedAttribute.value = this.getValue();
  //   }

  //   const defaultValueFunction = this.getDefaultValueFunction();

  //   if (defaultValueFunction !== undefined) {
  //     introspectedAttribute.default = defaultValueFunction;
  //   }

  //   return introspectedAttribute;
  // }

  // static unintrospect(introspectedAttribute) {
  //   ow(
  //     introspectedAttribute,
  //     'introspectedAttribute',
  //     ow.object.partialShape({value: ow.optional.any, default: ow.optional.function})
  //   );

  //   const {
  //     value: initialValue,
  //     default: defaultValue,
  //     ...introspectedProperty
  //   } = introspectedAttribute;

  //   const hasInitialValue = 'value' in introspectedAttribute;
  //   const hasDefaultValue = 'default' in introspectedAttribute;

  //   const {name, options} = super.unintrospect(introspectedProperty);

  //   if (hasInitialValue) {
  //     options.value = initialValue;
  //   }

  //   if (hasDefaultValue) {
  //     options.default = defaultValue;
  //   }

  //   return {name, options};
  // }

  // === Utilities ===

  static isAttribute(value: any): value is Attribute {
    return isAttributeInstance(value);
  }
}

export function isAttributeClass(value: any): value is typeof Attribute {
  return typeof value?.isAttribute === 'function';
}

export function isAttributeInstance(value: any): value is Attribute {
  return isAttributeClass(value?.constructor) === true;
}
