import {hasOwnProperty} from 'core-helpers';

import type {Component} from '../component';
import {AttributeOptions} from './attribute';
import {IdentifierAttribute, IdentifierValue} from './identifier-attribute';
import {isComponentInstance, ensureComponentClass} from '../utilities';

export class PrimaryIdentifierAttribute extends IdentifierAttribute {
  constructor(name: string, parent: Component, options: AttributeOptions = {}) {
    if (
      isComponentInstance(parent) &&
      parent.hasPrimaryIdentifierAttribute() &&
      parent.getPrimaryIdentifierAttribute().getName() !== name
    ) {
      throw new Error(
        `The component '${ensureComponentClass(
          parent
        ).getComponentName()}' already has a primary identifier attribute`
      );
    }

    super(name, parent, options);
  }

  // === Options ===

  setOptions(options: AttributeOptions = {}) {
    let {valueType = 'string', default: defaultValue} = options;

    if (valueType === 'string' && defaultValue === undefined) {
      defaultValue = primaryIdentifierAttributeStringDefaultValue;
    }

    super.setOptions({...options, default: defaultValue});
  }

  // === Value ===

  setValue(value: IdentifierValue, {source = 0} = {}) {
    if (hasOwnProperty(this, '_ignoreNextSetValueCall')) {
      delete this._ignoreNextSetValueCall;
      return {previousValue: undefined, newValue: undefined};
    }

    const previousValue = this.getValue({throwIfUnset: false, autoFork: false});

    if (previousValue !== undefined && value !== previousValue) {
      throw new Error(
        `The value of a primary identifier attribute cannot be modified (${this.describe()})`
      );
    }

    return super.setValue(value, {source});
  }

  // === Utilities ===

  static isPrimaryIdentifierAttribute(value: any): value is PrimaryIdentifierAttribute {
    return isPrimaryIdentifierAttributeInstance(value);
  }
}

export function isPrimaryIdentifierAttributeClass(
  value: any
): value is typeof PrimaryIdentifierAttribute {
  return typeof value?.isPrimaryIdentifierAttribute === 'function';
}

export function isPrimaryIdentifierAttributeInstance(
  value: any
): value is PrimaryIdentifierAttribute {
  return isPrimaryIdentifierAttributeClass(value?.constructor) === true;
}

export const primaryIdentifierAttributeStringDefaultValue = (function () {
  // Makes the function anonymous to make it a bit lighter when serialized
  return function (this: Component) {
    return this.constructor.generateId();
  };
})();
