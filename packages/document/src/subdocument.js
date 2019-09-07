import {Identity} from '@liaison/model';

import {DocumentNode} from './document-node';

export class Subdocument extends DocumentNode(Identity) {
  static isSubdocument(object) {
    return typeof object?.constructor.isSubdocument === 'function';
  }
}
