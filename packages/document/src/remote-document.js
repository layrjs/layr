import {callWithOneOrMany, callWithOneOrManyAsync} from '@storable/util';

import {Document} from './document';

export class RemoteDocument extends Document {
  _serializeReference() {
    return {...super._serializeReference(), _remote: true};
  }

  static async get(id, options) {
    callWithOneOrMany(id, id => {
      this.validateId(id);
    });

    const document = await this.callRemote('get', id, options);

    await callWithOneOrManyAsync(document, async document => {
      if (document) {
        await document.afterLoad();
      }
    });

    return document;
  }

  async save() {
    await this.beforeSave();

    await this.callRemote('save');

    this.commit();

    await this.afterSave();
  }

  async delete() {
    await this.beforeDelete();

    await this.callRemote('delete');

    await this.afterDelete();
  }

  static async find(options) {
    const documents = await this.callRemote('find', options);

    for (const document of documents) {
      await document.afterLoad();
    }

    return documents;
  }

  isOfType(name) {
    return name === 'RemoteDocument' ? true : super.isOfType(name); // Optimization
  }
}
