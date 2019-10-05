import {Method} from '@liaison/model';

import {StorableProperty} from './storable-property';

export class StorableMethod extends StorableProperty(Method) {
  constructor(parent, name, options = {}) {
    const {...unknownOptions} = options;

    super(parent, name, unknownOptions);

    this._options = options;
  }
}
