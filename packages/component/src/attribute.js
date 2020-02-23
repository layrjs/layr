import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

import {Property} from './property';

export class Attribute extends Property {
  getType() {
    return 'attribute';
  }

  getTypeArticle() {
    return 'an';
  }

  // === Options ===

  setOptions(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        value: ow.optional.any,
        default: ow.optional.function,
        getter: ow.optional.function,
        setter: ow.optional.function
      })
    );

    const {value: initialValue, default: defaultValue, getter, setter, ...otherOptions} = options;

    const hasInitialValue = 'value' in options;
    const hasDefaultValue = 'default' in options;

    super.setOptions(otherOptions);

    if (getter !== undefined || setter !== undefined) {
      if (hasInitialValue) {
        throw new Error(
          `The '${this.getName()}' ${this.getType()} cannot have both a getter or setter and an initial value`
        );
      }

      if (hasDefaultValue) {
        throw new Error(
          `The '${this.getName()}' ${this.getType()} cannot have both a getter or setter and a default value`
        );
      }

      if (getter !== undefined) {
        this._getter = getter;
      }

      if (setter !== undefined) {
        if (getter === undefined) {
          throw new Error(
            `The '${this.getName()}' ${this.getType()} cannot have a setter without a getter`
          );
        }
        this._setter = setter;
      }

      this._hasValue = true;

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

  getValue(options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({throwIfUnset: ow.optional.boolean, autoFork: ow.optional.boolean})
    );

    const {throwIfUnset = true, autoFork = true} = options;

    if (!this.hasValue()) {
      if (throwIfUnset) {
        throw new Error(
          `Cannot get the value of an unset ${this.getType()} (${this.getType()} name: '${this.getName()}')`
        );
      }
      return undefined;
    }

    if (this._getter !== undefined) {
      return this._getter.call(this.getParent());
    }

    if (autoFork && !hasOwnProperty(this, '_value')) {
      this._value = forkValue(this._value);
    }

    return this._value;
  }

  setValue(value) {
    if (this._setter !== undefined) {
      this._setter.call(this.getParent(), value);
      return;
    }

    if (this._getter !== undefined) {
      throw new Error(
        `Cannot set the value of ${this.getTypeArticle()} ${this.getType()} that has a getter but no setter (${this.getType()} name: ${this.getName()})`
      );
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = value;
    this._hasValue = true;

    return {previousValue, newValue: value};
  }

  unsetValue() {
    if (this._getter !== undefined) {
      throw new Error(
        `Cannot unset the value of ${this.getTypeArticle()} ${this.getType()} that has a getter (${this.getType()} name: ${this.getName()})`
      );
    }

    this._hasValue = false;
  }

  hasValue() {
    return this._hasValue === true;
  }

  // === Default value ===

  getDefaultValue() {
    let value = this.getDefaultValueFunction();

    if (value !== undefined) {
      value = value.call(this.getParent());
    }

    return value;
  }

  getDefaultValueFunction() {
    return this._default;
  }

  // === Introspection ===

  introspect() {
    const introspectedExposure = super.introspect();

    if (introspectedExposure === undefined) {
      return undefined;
    }

    if (this.hasValue()) {
      introspectedExposure.value = this.getValue();
    }

    const defaultValueFunction = this.getDefaultValueFunction();

    if (defaultValueFunction !== undefined) {
      introspectedExposure.default = defaultValueFunction;
    }

    return introspectedExposure;
  }

  // === Utilities ===

  static isAttribute(object) {
    return isAttribute(object);
  }
}

export function isAttribute(object) {
  return typeof object?.constructor?.isAttribute === 'function';
}

function forkValue(value) {
  return value; // TODO
}
