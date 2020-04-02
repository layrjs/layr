import {PrimaryIdentifierAttribute} from '@liaison/entity';

import {StorableAttributeMixin} from './storable-attribute';

export class StorablePrimaryIdentifierAttribute extends StorableAttributeMixin(
  PrimaryIdentifierAttribute
) {}
