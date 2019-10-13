import {Field} from '@liaison/model';
import ow from 'ow';

import {StorableProperty} from './storable-property';

export class StorableField extends StorableProperty(Field) {
  constructor(parent, name, options = {}) {
    const {
      isVolatile = false,
      loader,
      saver,
      afterLoad,
      beforeSave,
      afterSave,
      beforeDelete,
      afterDelete,
      ...unknownOptions
    } = options;

    ow(isVolatile, ow.boolean);
    ow(loader, ow.optional.function);
    ow(saver, ow.optional.function);
    ow(afterLoad, ow.optional.function);
    ow(beforeSave, ow.optional.function);
    ow(afterSave, ow.optional.function);
    ow(beforeDelete, ow.optional.function);
    ow(afterDelete, ow.optional.function);

    super(parent, name, unknownOptions);

    this._options = options;

    this._isVolatile = isVolatile;
    this._loader = loader;
    this._saver = saver;
    this._afterLoad = afterLoad;
    this._beforeSave = beforeSave;
    this._afterSave = afterSave;
    this._beforeDelete = beforeDelete;
    this._afterDelete = afterDelete;
  }

  isVolatile() {
    return this._isVolatile;
  }

  async _callLoader() {
    let value = this.getValue({throwIfInactive: false});
    value = await this._loader.call(this.getParent(), value);
    this.setValue(value);
  }

  async _callSaver() {
    let value = this.getValue();
    value = await this._saver.call(this.getParent(), value);
    this.setValue(value);
  }

  async _callAfterLoad() {
    await this._afterLoad.call(this.getParent(), this.getValue());
  }

  async _callBeforeSave() {
    await this._beforeSave.call(this.getParent(), this.getValue());
  }

  async _callAfterSave() {
    await this._afterSave.call(this.getParent(), this.getValue());
  }

  async _callBeforeDelete() {
    await this._beforeDelete.call(this.getParent(), this.getValue());
  }

  async _callAfterDelete() {
    await this._afterDelete.call(this.getParent(), this.getValue());
  }
}
