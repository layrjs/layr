import {getTypeOf} from 'core-helpers';

import type {ExpandAttributeSelectorOptions} from '../../component';
import type {Attribute} from '../attribute';
import type {AttributeSelector} from '../attribute-selector';
import {
  Validator,
  ValidatorFunction,
  IntrospectedValidator,
  runValidators,
  normalizeValidator
} from '../../validation';

export type IntrospectedValueType = {
  valueType?: string;
  validators?: IntrospectedValidator[];
  items?: IntrospectedValueType;
};

export type ValueTypeOptions = {
  isOptional?: boolean;
  validators?: (Validator | ValidatorFunction)[];
};

export class ValueType {
  _isOptional: boolean | undefined;
  _validators: Validator[];

  constructor(attribute: Attribute, options: ValueTypeOptions = {}) {
    const {isOptional, validators = []} = options;

    const normalizedValidators = validators.map((validator) =>
      normalizeValidator(validator, attribute)
    );

    this._isOptional = isOptional;
    this._validators = normalizedValidators;
  }

  isOptional() {
    return this._isOptional === true;
  }

  getValidators() {
    return this._validators;
  }

  toString(): string {
    return this.isOptional() ? '?' : '';
  }

  checkValue(value: unknown, attribute: Attribute) {
    if (!this._checkValue(value, attribute)) {
      throw new Error(
        `Cannot assign a value of an unexpected type (${attribute.describe()}, expected type: '${this.toString()}', received type: '${getTypeOf(
          value
        )}')`
      );
    }
  }

  _checkValue(value: unknown, _attribute: Attribute) {
    return value === undefined ? this.isOptional() : undefined;
  }

  _expandAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    _attribute: Attribute,
    _options: ExpandAttributeSelectorOptions
  ): AttributeSelector {
    return normalizedAttributeSelector !== false;
  }

  isValidValue(value: unknown) {
    const failedValidators = this.runValidators(value);

    return failedValidators.length === 0;
  }

  runValidators(value: unknown, _attributeSelector?: AttributeSelector) {
    const failedValidators = runValidators(this.getValidators(), value, {
      isOptional: this.isOptional()
    });

    const failedValidatorsWithPath = failedValidators.map((failedValidator) => ({
      validator: failedValidator,
      path: ''
    }));

    return failedValidatorsWithPath;
  }

  introspect() {
    const introspectedValueType: IntrospectedValueType = {valueType: this.toString()};

    const introspectedValidators = this.getValidators().map((validator) => validator.introspect());

    if (introspectedValidators.length > 0) {
      introspectedValueType.validators = introspectedValidators;
    }

    return introspectedValueType;
  }
}
