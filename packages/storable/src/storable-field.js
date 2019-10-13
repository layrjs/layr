import {Field} from '@liaison/model';
import ow from 'ow';

import {StorableProperty} from './storable-property';

export class StorableField extends StorableProperty(Field) {
  constructor(parent, name, options = {}) {
    const {isVolatile = false, loader, saver, ...unknownOptions} = options;

    ow(isVolatile, ow.boolean);
    ow(loader, ow.optional.function);
    ow(saver, ow.optional.function);

    super(parent, name, unknownOptions);

    this._options = options;

    this._isVolatile = isVolatile;
    this._loader = loader;
    this._saver = saver;
  }

  isVolatile() {
    return this._isVolatile;
  }

  hasLoader() {
    return this._loader !== undefined;
  }

  async _callLoader() {
    let value = this.getValue({throwIfInactive: false});
    value = await this._loader.call(this.getParent(), value);
    this.setValue(value);
  }

  hasSaver() {
    return this._saver !== undefined;
  }

  async _callSaver() {
    let value = this.getValue({throwIfInactive: false});
    value = await this._saver.call(this.getParent(), value);
    this.setValue(value);
  }
}
