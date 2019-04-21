import {Document} from './document';

export class RemoteDocument extends Document {
  _serializeReference() {
    return {...super._serializeReference(), _remote: true};
  }

  static async _load(documents, options) {
    return await this.callRemote('load', documents, options);
  }

  static async _save(documents, options) {
    return await this.callRemote('save', documents, options);
  }

  static async _delete(documents, options) {
    return await this.callRemote('delete', documents, options);
  }

  static async _find(options) {
    return await this.callRemote('find', options);
  }

  isOfType(name) {
    return name === 'RemoteDocument' ? true : super.isOfType(name); // Optimization
  }
}
