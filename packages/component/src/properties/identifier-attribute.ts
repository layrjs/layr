import {hasOwnProperty} from 'core-helpers';

import type {Component} from '../component';
import {Attribute, AttributeOptions} from './attribute';
import {isComponentInstance} from '../utilities';

export type IdentifierValue = string | number;

/**
 * *Inherits from [`Attribute`](https://layrjs.com/docs/v1/reference/attribute).*
 *
 * A base class from which [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/primary-identifier-attribute) and [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/secondary-identifier-attribute) are constructed. Unless you build a custom identifier attribute class, you probably won't have to use this class directly.
 */
export class IdentifierAttribute extends Attribute {
  constructor(name: string, parent: Component, options: AttributeOptions = {}) {
    if (!isComponentInstance(parent)) {
      throw new Error(
        `Cannot create a primary identifier attribute with a parent that is not a component instance (property: '${name}')`
      );
    }

    super(name, parent, options);
  }

  getParent() {
    return super.getParent() as Component;
  }

  // === Options ===

  setOptions(options: AttributeOptions = {}) {
    const {valueType = 'string'} = options;

    if (valueType.endsWith('?')) {
      throw new Error(
        `The value of an identifier attribute cannot be optional (${this.describe()}, specified type: '${valueType}')`
      );
    }

    if (valueType !== 'string' && valueType !== 'number') {
      throw new Error(
        `The type of an identifier attribute must be 'string' or 'number' (${this.describe()}, specified type: '${valueType}')`
      );
    }

    super.setOptions({...options, valueType});
  }

  // === Value ===

  getValue(options: {throwIfUnset?: boolean; autoFork?: boolean} = {}) {
    return super.getValue(options) as IdentifierValue | undefined;
  }

  setValue(value: IdentifierValue, {source = 0} = {}) {
    if (hasOwnProperty(this, '_ignoreNextSetValueCall')) {
      delete this._ignoreNextSetValueCall;
      return {previousValue: undefined, newValue: undefined};
    }

    const {previousValue, newValue} = super.setValue(value, {source}) as {
      previousValue: IdentifierValue | undefined;
      newValue: IdentifierValue | undefined;
    };

    const parent = this.getParent();
    const identityMap = parent.constructor.getIdentityMap();
    identityMap.updateComponent(parent, this.getName(), {previousValue, newValue});

    return {previousValue, newValue};
  }

  unsetValue() {
    if (!this.isSet()) {
      return {previousValue: undefined};
    }

    const {previousValue} = super.unsetValue() as {previousValue: IdentifierValue | undefined};

    const parent = this.getParent();
    const identityMap = parent.constructor.getIdentityMap();
    identityMap.updateComponent(parent, this.getName(), {previousValue, newValue: undefined});

    return {previousValue};
  }

  // === Utilities ===

  static isIdentifierAttribute(value: any): value is IdentifierAttribute {
    return isIdentifierAttributeInstance(value);
  }
}

/**
 * Returns whether the specified value is an `IdentifierAttribute` class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isIdentifierAttributeClass(value: any): value is typeof IdentifierAttribute {
  return typeof value?.isIdentifierAttribute === 'function';
}

/**
 * Returns whether the specified value is an `IdentifierAttribute` instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isIdentifierAttributeInstance(value: any): value is IdentifierAttribute {
  return isIdentifierAttributeClass(value?.constructor) === true;
}
