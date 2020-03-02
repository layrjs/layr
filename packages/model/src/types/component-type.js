import {validateComponentName} from '@liaison/component';
import {isPrototypeOf, getClassOf} from 'core-helpers';
import ow from 'ow';

import {Type} from './type';
import {isModelClass, isModel} from '../model';

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

  _getComponent({field}) {
    return getClassOf(field.getParent()).getRelatedComponent(this.getComponentName());
  }

  toString() {
    return `${this.getComponentName()}${super.toString()}`;
  }

  _checkValue(value, {field}) {
    const result = super._checkValue(value, {field});

    if (result !== undefined) {
      return result;
    }

    const component = this._getComponent({field});

    return value === component || isPrototypeOf(component, value);
  }

  _expandAttributeSelector(normalizedAttributeSelector, {field, ...options}) {
    if (normalizedAttributeSelector === false) {
      return false;
    }

    const component = this._getComponent({field});

    return component.expandAttributeSelector(normalizedAttributeSelector, options);
  }

  runValidators(value) {
    const failedValidators = super.runValidators(value);

    if (isModelClass(value) || isModel(value)) {
      const modelFailedValidators = value.runValidators();
      failedValidators.push(...modelFailedValidators);
    }

    return failedValidators;
  }
}
