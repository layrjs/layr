import {getTypeOf} from '@liaison/component';
import ow from 'ow';

import {validators} from './validator-builders';
import {Validator, isValidator} from './validator';

export function normalizeValidator(validator, options = {}) {
  ow(options, 'options', ow.object.exactShape({modelAttribute: ow.object}));

  const {modelAttribute} = options;

  if (isValidator(validator)) {
    return validator;
  }

  if (typeof validator !== 'function') {
    throw new Error(
      `The specified validator is not a function (${getTypeOf(modelAttribute, {
        humanize: true
      })} name: '${modelAttribute.getName()}')`
    );
  }

  if (Object.values(validators).includes(validator)) {
    throw new Error(
      `The specified validator is a validator builder that has not been called (${getTypeOf(
        modelAttribute,
        {humanize: true}
      )} name: '${modelAttribute.getName()}')`
    );
  }

  const normalizedValidator = new Validator(validator);

  return normalizedValidator;
}
