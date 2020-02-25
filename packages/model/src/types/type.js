import {getTypeOf} from '@liaison/component';
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
        field: ow.object
      })
    );

    const {isOptional, validators = [], field} = options;

    const normalizedValidators = validators.map(validator =>
      normalizeValidator(validator, {field})
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
    ow(options, 'options', ow.object.exactShape({field: ow.object}));

    const {field} = options;

    if (!this._checkValue(value)) {
      throw new Error(
        `Cannot assign a value of an unexpected type to the ${getTypeOf(
          field
        )} '${field.getName()}' (expected type: '${this.toString()}', received type: '${getTypeOf(
          value
        )}')`
      );
    }
  }

  _checkValue(value) {
    if (value === undefined) {
      return this.isOptional();
    }
  }

  runValidators(value) {
    const failedValidators = runValidators(this.getValidators(), value, {
      isOptional: this.isOptional()
    });

    const failedValidatorsWithPath = failedValidators.map(failedValidator => ({
      validator: failedValidator,
      path: ''
    }));

    return failedValidatorsWithPath;
  }
}
