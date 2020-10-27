import type {IdentifierDescriptor} from '@layr/component';
import {getTypeOf} from 'core-helpers';

import type {Store} from './store';

export declare class StorableLike {
  static getComponentName: () => string;

  static describeIdentifierDescriptor: (identifierDescriptor: IdentifierDescriptor) => string;

  static describeComponent: () => string;

  describeComponent: () => string;

  static getStore: () => Store;

  static hasStore: () => boolean;

  static __setStore: (store: Store) => void;
}

export function isStorableLikeClass(value: any): value is typeof StorableLike {
  return typeof value?.isStorable === 'function';
}

export function assertIsStorableLikeClass(value: any): asserts value is typeof StorableLike {
  if (!isStorableLikeClass(value)) {
    throw new Error(
      `Expected a storable component class, but received a value of type '${getTypeOf(value)}'`
    );
  }
}
