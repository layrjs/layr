import {Property, PropertyOptions, IntrospectedProperty} from './property';

export type IntrospectedMethod = IntrospectedProperty;

export type MethodOptions = PropertyOptions;

export class Method extends Property {
  _methodBrand!: void;

  static isMethod(value: any): value is Method {
    return isMethodInstance(value);
  }

  describeType() {
    return 'method';
  }
}

export function isMethodClass(value: any): value is typeof Method {
  return typeof value?.isMethod === 'function';
}

export function isMethodInstance(value: any): value is Method {
  return isMethodClass(value?.constructor) === true;
}
