import {getTypeOf} from 'core-helpers';

import type {ComponentServer} from './component-server';

export function isComponentServerClass(value: any): value is typeof ComponentServer {
  return typeof value?.isComponentServer === 'function';
}

export function isComponentServerInstance(value: any): value is ComponentServer {
  return typeof value?.constructor?.isComponentServer === 'function';
}

export function assertIsComponentServerInstance(value: any): asserts value is ComponentServer {
  if (!isComponentServerInstance(value)) {
    throw new Error(
      `Expected a component server instance, but received a value of type '${getTypeOf(value)}'`
    );
  }
}
