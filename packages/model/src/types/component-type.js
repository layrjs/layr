import {isComponent, getComponentName, validateComponentName} from '@liaison/component';
import ow from 'ow';

import {Type} from './type';
import {isModel} from '../model';

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
      ((isComponent(value?.prototype) || isComponent(value)) &&
        getComponentName(value) === this.getComponentName())
    );
  }

  runValidators(value) {
    const failedValidators = super.runValidators(value);

    if (isModel(value?.prototype) || isModel(value)) {
      const modelFailedValidators = value.runValidators();
      failedValidators.push(...modelFailedValidators);
    }

    return failedValidators;
  }
}
