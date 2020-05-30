import {SecondaryIdentifierAttribute} from '@liaison/component';

import {StorableAttributeMixin} from './storable-attribute';

export class StorableSecondaryIdentifierAttribute extends StorableAttributeMixin(
  SecondaryIdentifierAttribute
) {
  _storableSecondaryIdentifierAttributeBrand!: void;
}
