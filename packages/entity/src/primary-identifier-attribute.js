import ow from 'ow';

import {IdentifierAttribute} from './identifier-attribute';
import {isEntity} from './utilities';

export class PrimaryIdentifierAttribute extends IdentifierAttribute {
  constructor(name, parent, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(parent, 'parent', ow.object);
    ow(options, 'options', ow.optional.object);

    if (!isEntity(parent)) {
      throw new Error(
        `Cannot create a primary identifier attribute with a parent that does not inherit from Entity (property name: '${name}')`
      );
    }

    const existingPrimaryIdentifierAttribute = parent.getPrimaryIdentifierAttribute({
      throwIfMissing: false,
      autoFork: false
    });

    if (
      existingPrimaryIdentifierAttribute !== undefined &&
      existingPrimaryIdentifierAttribute.getName() !== name
    ) {
      throw new Error(
        `The ${parent.getComponentType()} '${parent.getComponentName()}' has already a primary identifier attribute`
      );
    }

    super(name, parent, options);
  }

  // === Options ===

  setOptions(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        type: ow.optional.string.nonEmpty,
        default: ow.optional.function
      })
    );

    let {type = 'string', default: defaultValue, ...otherOptions} = options;

    if (type === 'string' && defaultValue === undefined) {
      defaultValue = primaryIdentifierAttributeStringDefaultValue;
    }

    super.setOptions({type, default: defaultValue, ...otherOptions});
  }

  // === Value ===

  setValue(value) {
    const previousValue = this.getValue({throwIfUnset: false, autoFork: false});

    if (previousValue !== undefined && value !== previousValue) {
      throw new Error(
        `The value of a primary identifier attribute cannot be modified (attribute name: '${this.getName()}')`
      );
    }

    return super.setValue(value);
  }

  // === Utilities ===

  static isPrimaryIdentifierAttribute(object) {
    return isPrimaryIdentifierAttribute(object);
  }
}

export function isPrimaryIdentifierAttributeClass(object) {
  return typeof object?.isPrimaryIdentifierAttribute === 'function';
}

export function isPrimaryIdentifierAttribute(object) {
  return isPrimaryIdentifierAttributeClass(object?.constructor) === true;
}

export const primaryIdentifierAttributeStringDefaultValue = (function() {
  // Makes the function anonymous to make it lighter when serialized
  return function() {
    return this.constructor.generateId();
  };
})();
