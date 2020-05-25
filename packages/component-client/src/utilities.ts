import type {ComponentClient} from './component-client';

export function isComponentClientClass(value: any): value is typeof ComponentClient {
  return typeof value?.isComponentClient === 'function';
}

export function isComponentClientInstance(value: any): value is ComponentClient {
  return typeof value?.constructor?.isComponentClient === 'function';
}
