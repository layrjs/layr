import {AttributeSelector} from '@layr/component';

import type {StorableComponent} from './storable';
import type {Query} from './query';
import type {SortDescriptor} from './storable';

export declare class StoreLike {
  load: (
    storable: StorableComponent,
    options?: {attributeSelector?: AttributeSelector; throwIfMissing?: boolean}
  ) => Promise<StorableComponent | undefined>;

  save: (
    storable: StorableComponent,
    options?: {
      attributeSelector?: AttributeSelector;
      throwIfMissing?: boolean;
      throwIfExists?: boolean;
    }
  ) => Promise<StorableComponent | undefined>;

  delete: (
    storable: StorableComponent,
    options?: {throwIfMissing?: boolean}
  ) => Promise<StorableComponent | undefined>;

  find: (
    storable: typeof StorableComponent,
    query?: Query,
    options?: {sort?: SortDescriptor; skip?: number; limit?: number}
  ) => Promise<StorableComponent[]>;

  count: (storable: typeof StorableComponent, query?: Query) => Promise<number>;
}
