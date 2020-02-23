import ow from 'ow';

import {getTypeOf} from './utilities';
import {normalizeValidator} from '../validation/utilities';

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
        `Cannot assign a value of an unexpected type to the field '${field.getName()}' (expected type: '${this.toString()}', received type: '${getTypeOf(
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
}
