import {Document} from './document';

export class RemoteDocument extends Document {
  _serializeReference() {
    return {...super._serializeReference(), _remote: true};
  }

  static async _get(id, options) {
    return await this.callRemote('get', id, options);
  }

  async _save() {
    await this.callRemote('save');
  }

  async _delete() {
    await this.callRemote('delete');
  }

  static async _find(options) {
    return await this.callRemote('find', options);
  }

  isOfType(name) {
    return name === 'RemoteDocument' ? true : super.isOfType(name); // Optimization
  }
}
