import {PrimaryIdentifierAttribute} from '@liaison/component';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property, Attribute} from '@liaison/component';

import {StorableAttributeMixin} from './storable-attribute';

export class StorablePrimaryIdentifierAttribute extends StorableAttributeMixin(
  PrimaryIdentifierAttribute
) {
  _storablePrimaryIdentifierAttributeBrand!: void;
}
