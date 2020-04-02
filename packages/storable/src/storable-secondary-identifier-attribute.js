import {SecondaryIdentifierAttribute} from '@liaison/entity';

import {StorableAttributeMixin} from './storable-attribute';

export class StorableSecondaryIdentifierAttribute extends StorableAttributeMixin(
  SecondaryIdentifierAttribute
) {}
