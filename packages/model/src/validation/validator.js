import {hasOwnProperty, getFunctionName} from 'core-helpers';
import ow from 'ow';

export class Validator {
  constructor(func, options = {}) {
    ow(func, 'func', ow.function);
    ow(
      options,
      'options',
      ow.object.exactShape({
        name: ow.optional.string.nonEmpty,
        arguments: ow.optional.array,
        message: ow.optional.string.nonEmpty
      })
    );

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

  run(value) {
    return this.getFunction()(value, ...this.getArguments());
  }

  introspect() {
    const introspectedValidator = {
      name: this.getName(),
      function: this.getFunction()
    };

    const args = this.getArguments();

    if (args.length > 0) {
      introspectedValidator.arguments = args;
    }

    introspectedValidator.message = this.getMessage();

    return introspectedValidator;
  }

  static unintrospect(introspectedValidators) {
    return {...introspectedValidators};
  }

  static isValidator(object) {
    return isValidator(object);
  }
}

export function isValidator(object) {
  return typeof object?.constructor?.isValidator === 'function';
}

export function isSerializedValidator(object) {
  return object !== undefined && hasOwnProperty(object, '__validator');
}

function required(value) {
  return value !== undefined;
}

export const requiredValidator = new Validator(required);

export function runValidators(validators, value, options = {}) {
  ow(validators, 'validators', ow.array);
  ow(options, 'options', ow.object.exactShape({isOptional: ow.optional.boolean}));

  const {isOptional = false} = options;

  if (value === undefined) {
    return isOptional ? [] : [requiredValidator];
  }

  const failedValidators = [];

  for (const validator of validators) {
    if (!validator.run(value)) {
      failedValidators.push(validator);
    }
  }

  return failedValidators;
}

function stringifyArguments(args) {
  let string = JSON.stringify(args, (key, value) => {
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
