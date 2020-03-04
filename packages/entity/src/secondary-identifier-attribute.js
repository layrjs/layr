import {IdentifierAttribute} from './identifier-attribute';

export class SecondaryIdentifierAttribute extends IdentifierAttribute {
  // === Utilities ===

  static isSecondaryIdentifierAttribute(object) {
    return isSecondaryIdentifierAttribute(object);
  }
}

export function isSecondaryIdentifierAttributeClass(object) {
  return typeof object?.isSecondaryIdentifierAttribute === 'function';
}

export function isSecondaryIdentifierAttribute(object) {
  return isSecondaryIdentifierAttributeClass(object?.constructor) === true;
}
