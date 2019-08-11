import {IdentityModel} from '@layr/model';

import {DocumentNode} from './document-node';

export class Subdocument extends DocumentNode(IdentityModel) {
  static isSubdocument(object) {
    return typeof object?.constructor.isSubdocument === 'function';
  }
}
