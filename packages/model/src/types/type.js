import {getHumanTypeOf} from '@liaison/component';
import ow from 'ow';

import {runValidators, normalizeValidator} from '../validation';

export class Type {
  constructor(options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({
        isOptional: ow.optional.boolean,
        validators: ow.optional.array,
        modelAttribute: ow.object
      })
    );

    const {isOptional, validators = [], modelAttribute} = options;

    const normalizedValidators = validators.map(validator =>
      normalizeValidator(validator, {modelAttribute})
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

  toString() {
    return this.isOptional() ? '?' : '';
  }

  checkValue(value, options = {}) {
    ow(options, 'options', ow.object.exactShape({modelAttribute: ow.object}));

    const {modelAttribute} = options;

    if (!this._checkValue(value, {modelAttribute})) {
      throw new Error(
        `Cannot assign a value of an unexpected type (${modelAttribute.describe()}, expected type: '${this.toString()}', received type: '${getHumanTypeOf(
          value
        )}')`
      );
    }
  }

  // eslint-disable-next-line no-unused-vars
  _checkValue(value, options) {
    if (value === undefined) {
      return this.isOptional();
    }
  }

  _expandAttributeSelector(normalizedAttributeSelector, _options) {
    return normalizedAttributeSelector !== false;
  }

  runValidators(value, _attributeSelector) {
    const failedValidators = runValidators(this.getValidators(), value, {
      isOptional: this.isOptional()
    });

    const failedValidatorsWithPath = failedValidators.map(failedValidator => ({
      validator: failedValidator,
      path: ''
    }));

    return failedValidatorsWithPath;
  }

  introspect() {
    const introspectedType = {valueType: this.toString()};

    const introspectedValidators = this.getValidators().map(validator => validator.introspect());

    if (introspectedValidators.length > 0) {
      introspectedType.validators = introspectedValidators;
    }

    return introspectedType;
  }
}
