import type {AbstractStore} from './abstract-store';

export function isStoreClass(value: any): value is typeof AbstractStore {
  return typeof value?.isStore === 'function';
}

export function isStoreInstance(value: any): value is AbstractStore {
  return typeof value?.constructor?.isStore === 'function';
}
