import {Property, PropertyOptions} from './property';

export type MethodOptions = PropertyOptions;

export class Method extends Property {
  // @ts-ignore
  private __nominal!: void; // Make TS believe that Method is different than Property

  static isMethod(value: any): value is Method {
    return isMethodInstance(value);
  }
}

export function isMethodClass(value: any): value is typeof Method {
  return typeof value?.isMethod === 'function';
}

export function isMethodInstance(value: any): value is Method {
  return isMethodClass(value?.constructor) === true;
}
