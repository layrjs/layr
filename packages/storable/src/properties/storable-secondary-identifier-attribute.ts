import {SecondaryIdentifierAttribute} from '@liaison/component';

// TODO: Find a way to remove this useless import
// I did that to remove a TypeScript error in the generated declaration file
// @ts-ignore
import type {Property, Attribute} from '@liaison/component';

import {StorableAttributeMixin} from './storable-attribute';

export class StorableSecondaryIdentifierAttribute extends StorableAttributeMixin(
  SecondaryIdentifierAttribute
) {
  _storableSecondaryIdentifierAttributeBrand!: void;
}
