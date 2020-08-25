import type {Store} from './store';

export function isStoreClass(value: any): value is typeof Store {
  return typeof value?.isStore === 'function';
}

export function isStoreInstance(value: any): value is Store {
  return typeof value?.constructor?.isStore === 'function';
}
