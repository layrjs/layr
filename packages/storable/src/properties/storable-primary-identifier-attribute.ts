import {PrimaryIdentifierAttribute} from '@liaison/component';

import {StorableAttributeMixin} from './storable-attribute';

export class StorablePrimaryIdentifierAttribute extends StorableAttributeMixin(
  PrimaryIdentifierAttribute
) {
  _storablePrimaryIdentifierAttributeBrand!: void;
}
