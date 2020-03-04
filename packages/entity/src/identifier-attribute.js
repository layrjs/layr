import {ModelAttribute, getTypeOf} from '@liaison/model';
import ow from 'ow';

export class IdentifierAttribute extends ModelAttribute {
  // === Options ===

  setOptions(options = {}) {
    ow(options, 'options', ow.object.partialShape({type: ow.optional.string.nonEmpty}));

    const {type = 'string', ...otherOptions} = options;

    if (type.endsWith('?')) {
      throw new Error(
        `The value of an identifier attribute cannot be optional (${getTypeOf(this, {
          humanize: true
        })} name: '${this.getName()}', specified type: '${type}')`
      );
    }

    if (type !== 'string' && type !== 'number') {
      throw new Error(
        `The type of an identifier attribute must be 'string' or 'number' (${getTypeOf(this, {
          humanize: true
        })} name: '${this.getName()}', specified type: '${type}')`
      );
    }

    super.setOptions({type, ...otherOptions});
  }

  // === Utilities ===

  static isIdentifierAttribute(object) {
    return isIdentifierAttribute(object);
  }
}

export function isIdentifierAttributeClass(object) {
  return typeof object?.isIdentifierAttribute === 'function';
}

export function isIdentifierAttribute(object) {
  return isIdentifierAttributeClass(object?.constructor) === true;
}
