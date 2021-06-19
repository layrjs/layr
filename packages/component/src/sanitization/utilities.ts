import {sanitizers, SanitizerBuilder} from './sanitizer-builders';
import {Sanitizer, SanitizerFunction, isSanitizerInstance} from './sanitizer';
import type {Attribute} from '../properties';

export function normalizeSanitizer(sanitizer: Sanitizer | SanitizerFunction, attribute: Attribute) {
  if (isSanitizerInstance(sanitizer)) {
    return sanitizer;
  }

  if (typeof sanitizer !== 'function') {
    throw new Error(`The specified sanitizer is not a function (${attribute.describe()})`);
  }

  if (Object.values(sanitizers).includes((sanitizer as unknown) as SanitizerBuilder)) {
    throw new Error(
      `The specified sanitizer is a sanitizer builder that has not been called (${attribute.describe()})`
    );
  }

  return new Sanitizer(sanitizer);
}
