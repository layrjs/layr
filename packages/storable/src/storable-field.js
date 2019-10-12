import {Field} from '@liaison/model';
import ow from 'ow';

import {StorableProperty} from './storable-property';

export class StorableField extends StorableProperty(Field) {
  constructor(parent, name, options = {}) {
    const {isVolatile = false, loader, ...unknownOptions} = options;

    ow(isVolatile, ow.boolean);
    ow(loader, ow.optional.function);

    super(parent, name, unknownOptions);

    this._options = options;

    this._isVolatile = isVolatile;
    this._loader = loader;
  }

  isVolatile() {
    return this._isVolatile;
  }

  async load() {
    const loader = this._loader;

    if (loader === undefined) {
      throw new Error(
        `Cannot use load() with a field that has no loader (field: '${this.getName()}')`
      );
    }

    let value = this.getValue({throwIfInactive: false});
    value = await loader.call(this.getParent(), value);
    this.setValue(value);

    return value;
  }

  hasLoader() {
    return this._loader !== undefined;
  }
}
