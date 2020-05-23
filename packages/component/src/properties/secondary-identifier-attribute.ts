import {IdentifierAttribute} from './identifier-attribute';

export class SecondaryIdentifierAttribute extends IdentifierAttribute {
  // @ts-ignore
  private __nominal!: void; // Make TS believe that SecondaryIdentifierAttribute is different than IdentifierAttribute

  // === Utilities ===

  static isSecondaryIdentifierAttribute(value: any): value is SecondaryIdentifierAttribute {
    return isSecondaryIdentifierAttributeInstance(value);
  }
}

export function isSecondaryIdentifierAttributeClass(
  value: any
): value is typeof SecondaryIdentifierAttribute {
  return typeof value?.isSecondaryIdentifierAttribute === 'function';
}

export function isSecondaryIdentifierAttributeInstance(
  value: any
): value is SecondaryIdentifierAttribute {
  return isSecondaryIdentifierAttributeClass(value?.constructor) === true;
}
