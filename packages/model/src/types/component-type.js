import {validateComponentName, getTypeOf} from '@liaison/component';
import {isPrototypeOf, getClassOf} from 'core-helpers';
import ow from 'ow';

import {Type} from './type';
import {isModelClassOrInstance, isModelAttribute} from '../utilities';

export class ComponentType extends Type {
  constructor(options = {}) {
    ow(options, 'options', ow.object.partialShape({componentName: ow.string}));

    const {componentName, ...otherOptions} = options;

    super(otherOptions);

    validateComponentName(componentName);

    this._componentName = componentName;
  }

  getComponentName() {
    return this._componentName;
  }

  getComponentForAttribute(attribute) {
    if (!isModelAttribute(attribute)) {
      throw new Error(
        `Expected a model attribute, but received a value of type '${getTypeOf(attribute)}'`
      );
    }

    return getClassOf(attribute.getParent()).getComponent(this.getComponentName(), {
      includePrototypes: true
    });
  }

  toString() {
    return `${this.getComponentName()}${super.toString()}`;
  }

  _checkValue(value, {modelAttribute}) {
    const result = super._checkValue(value, {modelAttribute});

    if (result !== undefined) {
      return result;
    }

    const component = this.getComponentForAttribute(modelAttribute);

    return value === component || isPrototypeOf(component, value);
  }

  _expandAttributeSelector(normalizedAttributeSelector, {modelAttribute, ...options}) {
    if (normalizedAttributeSelector === false) {
      return false;
    }

    const component = this.getComponentForAttribute(modelAttribute);

    return component.expandAttributeSelector(normalizedAttributeSelector, options);
  }

  runValidators(value, attributeSelector = true) {
    const failedValidators = super.runValidators(value, attributeSelector);

    if (isModelClassOrInstance(value)) {
      const modelFailedValidators = value.runValidators(attributeSelector);
      failedValidators.push(...modelFailedValidators);
    }

    return failedValidators;
  }

  static isComponentType(object) {
    return isComponentType(object);
  }
}

export function isComponentType(object) {
  return typeof object?.constructor?.isComponentType === 'function';
}
