import {BaseDocument} from './base-document';

export class Subdocument extends BaseDocument {
  isOfType(name) {
    return name === 'Subdocument' ? true : super.isOfType(name); // Optimization
  }
}
