import {hasOwnProperty, getFunctionName} from 'core-helpers';

export type ValidatorFunction = (value: any, ...args: any[]) => boolean;

type ValidatorOptions = {
  name?: string;
  arguments?: any[];
  message?: string;
};

export type IntrospectedValidator = {
  name: string;
  function: ValidatorFunction;
  arguments?: any[];
  message: string;
};

export class Validator {
  _function: ValidatorFunction;
  _name: string;
  _arguments: any[];
  _message: string;

  constructor(func: ValidatorFunction, options: ValidatorOptions = {}) {
    let {name, arguments: args = [], message} = options;

    if (name === undefined) {
      name = getFunctionName(func) || 'anonymous';
    }

    if (message === undefined) {
      const signature = `${name}(${stringifyArguments(args)})`;
      message = `The validator \`${signature}\` failed`;
    }

    this._function = func;
    this._name = name;
    this._arguments = args;
    this._message = message;
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

  getMessage() {
    return this._message;
  }

  run(value: any) {
    return this.getFunction()(value, ...this.getArguments());
  }

  introspect() {
    const introspectedValidator: Partial<IntrospectedValidator> = {
      name: this.getName(),
      function: this.getFunction()
    };

    const args = this.getArguments();

    if (args.length > 0) {
      introspectedValidator.arguments = args;
    }

    introspectedValidator.message = this.getMessage();

    return introspectedValidator as IntrospectedValidator;
  }

  static unintrospect(introspectedValidator: IntrospectedValidator) {
    return {...introspectedValidator};
  }

  static isValidator(value: any): value is Validator {
    return isValidatorInstance(value);
  }
}

export function isValidatorInstance(value: any): value is Validator {
  return typeof value?.constructor?.isValidator === 'function';
}

export function isSerializedValidator(object: object) {
  return object !== undefined && hasOwnProperty(object, '__validator');
}

function required(value: any) {
  return value !== undefined;
}

export const requiredValidator = new Validator(required);

export function runValidators(
  validators: Validator[],
  value: any,
  options: {isOptional?: boolean} = {}
) {
  const {isOptional = false} = options;

  if (value === undefined) {
    return isOptional ? [] : [requiredValidator];
  }

  const failedValidators: Validator[] = [];

  for (const validator of validators) {
    if (!validator.run(value)) {
      failedValidators.push(validator);
    }
  }

  return failedValidators;
}

function stringifyArguments(args: any[]) {
  let string = JSON.stringify(args, (_key, value) => {
    if (value instanceof RegExp) {
      return `__regExp(${value.toString()})regExp__`;
    }

    return value;
  });

  // Fix the RegExp
  string = string.replace(/"__regExp\(/g, '');
  string = string.replace(/\)regExp__"/g, '');

  // Remove the array brackets
  string = string.slice(1, -1);

  return string;
}
