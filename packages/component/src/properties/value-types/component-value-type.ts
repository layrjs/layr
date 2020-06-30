import {ValueType, ValueTypeOptions} from './value-type';
import type {ExpandAttributeSelectorOptions} from '../../component';
import type {Attribute} from '../attribute';
import type {AttributeSelector} from '../attribute-selector';
import {
  isComponentClassOrInstance,
  isComponentClass,
  isComponentInstance,
  ensureComponentClass,
  assertIsComponentType
} from '../../utilities';

export class ComponentValueType extends ValueType {
  _componentType: string;

  constructor(componentType: string, attribute: Attribute, options: ValueTypeOptions = {}) {
    super(attribute, options);

    assertIsComponentType(componentType);

    this._componentType = componentType;
  }

  getComponentType() {
    return this._componentType;
  }

  getComponent(attribute: Attribute) {
    return ensureComponentClass(attribute.getParent()).getComponentOfType(this.getComponentType());
  }

  toString() {
    return `${this.getComponentType()}${super.toString()}`;
  }

  _checkValue(value: unknown, attribute: Attribute) {
    const result = super._checkValue(value, attribute);

    if (result !== undefined) {
      return result;
    }

    const component = this.getComponent(attribute);

    if (value === component) {
      return true;
    }

    if (isComponentClass(value) && isComponentClass(component)) {
      return value.isForkOf(component);
    }

    if (isComponentInstance(value) && isComponentInstance(component)) {
      return value.constructor === component.constructor || value.isForkOf(component);
    }

    return false;
  }

  _expandAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    attribute: Attribute,
    component: unknown,
    options: ExpandAttributeSelectorOptions
  ): AttributeSelector {
    const {setAttributesOnly} = options;

    if (normalizedAttributeSelector === false) {
      return false;
    }

    if (!setAttributesOnly) {
      component = this.getComponent(attribute);
    }

    if (!isComponentClassOrInstance(component)) {
      return {}; // `setAttributesOnly` is true and `component` is undefined
    }

    return component.expandAttributeSelector(normalizedAttributeSelector, options);
  }

  runValidators(value: unknown, attributeSelector?: AttributeSelector) {
    const failedValidators = super.runValidators(value, attributeSelector);

    if (isComponentClassOrInstance(value)) {
      const componentFailedValidators = value.runValidators(attributeSelector);
      failedValidators.push(...componentFailedValidators);
    }

    return failedValidators;
  }

  static isComponentValueType(value: any): value is ComponentValueType {
    return isComponentValueTypeInstance(value);
  }
}

export function isComponentValueTypeInstance(value: any): value is ComponentValueType {
  return typeof value?.constructor?.isComponentValueType === 'function';
}
