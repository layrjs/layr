import {ModelAttribute, getHumanTypeOf} from '@liaison/model';
import ow from 'ow';

export class IdentifierAttribute extends ModelAttribute {
  // === Options ===

  setOptions(options = {}) {
    ow(options, 'options', ow.object.partialShape({type: ow.optional.string.nonEmpty}));

    const {type = 'string', ...otherOptions} = options;

    if (type.endsWith('?')) {
      throw new Error(
        `The value of an identifier attribute cannot be optional (${getHumanTypeOf(
          this
        )} name: '${this.getName()}', specified type: '${type}')`
      );
    }

    if (type !== 'string' && type !== 'number') {
      throw new Error(
        `The type of an identifier attribute must be 'string' or 'number' (${getHumanTypeOf(
          this
        )} name: '${this.getName()}', specified type: '${type}')`
      );
    }

    super.setOptions({type, ...otherOptions});
  }

  // === Value ===

  setValue(value) {
    const {previousValue, newValue} = super.setValue(value);

    const entity = this.getParent();
    const entityManager = entity.constructor.__getEntityManager();
    const name = this.getName();
    entityManager.updateEntity(entity, name, {previousValue, newValue});

    return {previousValue, newValue};
  }

  unsetValue() {
    if (!this.isSet()) {
      return;
    }

    const {previousValue} = super.unsetValue();

    const entity = this.getParent();
    const entityManager = entity.constructor.__getEntityManager();
    const name = this.getName();
    entityManager.updateEntity(entity, name, {previousValue});

    return {previousValue};
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
