import {hasOwnProperty} from 'core-helpers';
import ow from 'ow';

import {Property} from './property';

export class Attribute extends Property {
  getType() {
    return 'attribute';
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
          `The '${this.getName()}' attribute cannot have both a getter or setter and an initial value`
        );
      }

      if (hasDefaultValue) {
        throw new Error(
          `The '${this.getName()}' attribute cannot have both a getter or setter and a default value`
        );
      }

      if (getter !== undefined) {
        this._getter = getter;
      }

      if (setter !== undefined) {
        if (getter === undefined) {
          throw new Error(
            `The '${this.getName()}' attribute cannot have a setter without a getter`
          );
        }
        this._setter = setter;
      }

      this._isActive = true;
    } else {
      if (hasInitialValue) {
        this._value = initialValue;
        this._isActive = true;
      }

      if (hasDefaultValue) {
        this._default = defaultValue;
      }
    }
  }

  // === isActive mark ===

  isActive() {
    return this._isActive === true;
  }

  activate() {
    this._isActive = true;
  }

  deactivate() {
    this._isActive = false;
  }

  // === Value ===

  getValue(options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({throwIfInactive: ow.optional.boolean, autoFork: ow.optional.boolean})
    );

    const {throwIfInactive = true, autoFork = true} = options;

    if (!this.isActive()) {
      if (throwIfInactive) {
        throw new Error(
          `Cannot get the value from the '${this.getName()}' attribute which is inactive`
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
    } else {
      const previousValue = this.getValue({throwIfInactive: false});

      this.activate();

      if (value?.valueOf() !== previousValue?.valueOf()) {
        this._value = value;
      }
    }

    return value;
  }

  getDefaultValue() {
    let value = this._default;

    if (value !== undefined) {
      value = value.call(this.getParent());
    }

    return value;
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
