import {AbstractDocument} from './abstract-document';

export class ParentDocument extends AbstractDocument {
  _serializeReference() {
    return {...super._serializeReference()};
  }

  static async _load(documents, options) {
    return await this.callParent('load', documents, {populate: false, ...options});
  }

  static async _save(documents, options) {
    return await this.callParent('save', documents, options);
  }

  static async _delete(documents, options) {
    return await this.callParent('delete', documents, options);
  }

  static async _find(options) {
    return await this.callParent('find', {populate: false, ...options});
  }

  isOfType(name) {
    return name === 'ParentDocument' ? true : super.isOfType(name); // Optimization
  }
}
