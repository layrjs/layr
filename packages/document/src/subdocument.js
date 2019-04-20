import {Identity} from '@storable/model';

import {BaseDocument} from './base-document';

export class Subdocument extends BaseDocument(Identity) {
  isOfType(name) {
    return name === 'Subdocument' ? true : super.isOfType(name); // Optimization
  }
}
