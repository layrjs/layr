import {validateComponentName} from '@liaison/component';
import ow from 'ow';

import {Type} from './type';

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

  // _checkValue(value) {
  //   // TODO
  // }
}
