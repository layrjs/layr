import {getFunctionName} from 'core-helpers';

export type SanitizerFunction = (value: any, ...args: any[]) => any;

type SanitizerOptions = {
  name?: string;
  arguments?: any[];
};

export class Sanitizer {
  _function: SanitizerFunction;
  _name: string;
  _arguments: any[];

  constructor(func: SanitizerFunction, options: SanitizerOptions = {}) {
    let {name, arguments: args = []} = options;

    if (name === undefined) {
      name = getFunctionName(func) || 'anonymous';
    }

    this._function = func;
    this._name = name;
    this._arguments = args;
  }

  getFunction() {
    return this._function;
  }

  getName() {
    return this._name;
  }

  getArguments() {
    return this._arguments;
  }

  run(value: any) {
    return this.getFunction()(value, ...this.getArguments());
  }

  static isSanitizer(value: any): value is Sanitizer {
    return isSanitizerInstance(value);
  }
}

export function isSanitizerInstance(value: any): value is Sanitizer {
  return typeof value?.constructor?.isSanitizer === 'function';
}

export function runSanitizers(sanitizers: Sanitizer[], value: any) {
  for (const sanitizer of sanitizers) {
    value = sanitizer.run(value);
  }

  return value;
}
