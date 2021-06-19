import trim from 'lodash/trim';
import compact from 'lodash/compact';

import {Sanitizer, SanitizerFunction} from './sanitizer';

const sanitizerFunctions: {[name: string]: SanitizerFunction} = {
  // Strings

  trim: (value) => (value !== undefined ? trim(value) : undefined),

  // Arrays

  compact: (value) => (value !== undefined ? compact(value) : undefined)
};

export type SanitizerBuilder = (...args: any[]) => Sanitizer;

export const sanitizers: {[name: string]: SanitizerBuilder} = {};

for (const [name, func] of Object.entries(sanitizerFunctions)) {
  sanitizers[name] = (...args) => createSanitizer(name, func, args);
}

function createSanitizer(name: string, func: SanitizerFunction, args: any[]) {
  const numberOfRequiredArguments = func.length - 1;
  const sanitizerArguments = args.slice(0, numberOfRequiredArguments);

  if (sanitizerArguments.length < numberOfRequiredArguments) {
    throw new Error(`A required parameter is missing to build the sanitizer '${name}'`);
  }

  return new Sanitizer(func, {name, arguments: sanitizerArguments});
}
