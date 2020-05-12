import {hasOwnProperty} from 'core-helpers';

import type {Component, ExpandAttributeSelectorOptions} from './component';
import {Property, PropertyOptions} from './property';
import {fork} from './forking';
import {AttributeSelector} from './attribute-selector';

export type AttributeOptions = PropertyOptions & {
  value?: any;
  default?: any;
  getter?: (this: any) => any;
  setter?: (this: any, value: any) => void;
};

export class Attribute extends Property {
  constructor(name: string, parent: typeof Component | Component, options: AttributeOptions = {}) {
    super(name, parent, options);
  }

  // === Options ===

  private _default?: any;
  private _getter?: () => any;
  private _setter?: (value: any) => void;

  setOptions(options: AttributeOptions = {}) {
    const {value: initialValue, default: defaultValue, getter, setter, ...otherOptions} = options;

    const hasInitialValue = 'value' in options;
    const hasDefaultValue = 'default' in options;

    super.setOptions(otherOptions);

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
      this._value = fork(this._value, {parentComponent: this.getParent()});
    }

    return this._value;
  }

  setValue(value: any) {
    if (this._setter !== undefined) {
      this._setter.call(this.getParent(), value);
      return;
    }

    if (this._getter !== undefined) {
      throw new Error(
        `Cannot set the value of an attribute that has a getter but no setter (${this.describe()})`
      );
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = value;
    this._isSet = true;

    return {previousValue, newValue: value};
  }

  unsetValue() {
    if (this._getter !== undefined) {
      throw new Error(
        `Cannot unset the value of an attribute that has a getter (${this.describe()})`
      );
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = undefined;
    this._isSet = false;

    return {previousValue};
  }

  isSet() {
    return this._isSet === true;
  }

  // === Default value ===

  getDefault() {
    return this._default;
  }

  // Attribute selectors

  _expandAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    _options: ExpandAttributeSelectorOptions
  ) {
    return normalizedAttributeSelector;
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
