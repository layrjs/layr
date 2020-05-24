import type {ComponentServer} from './component-server';

export function isComponentServerClass(value: any): value is typeof ComponentServer {
  return typeof value?.isComponentServer === 'function';
}

export function isComponentServerInstance(value: any): value is ComponentServer {
  return typeof value?.constructor?.isComponentServer === 'function';
}
