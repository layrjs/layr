import {
  isComponentClass,
  isComponent,
  getComponentName,
  validateComponentName
} from '@liaison/component';
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

  toString() {
    return `${this.getComponentName()}${super.toString()}`;
  }

  _checkValue(value) {
    return (
      super._checkValue(value) ??
      ((isComponentClass(value) || isComponent(value)) &&
        getComponentName(value) === this.getComponentName())
    );
  }

  _expandAttributeSelector(normalizedAttributeSelector, _options) {
    return normalizedAttributeSelector !== false; // TODO
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
