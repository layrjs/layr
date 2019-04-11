import {BaseDocument} from './base-document';

export class Document extends BaseDocument {
  serialize({_isDeep, ...otherOptions} = {}) {
    if (_isDeep) {
      // It is a referenced document
      return this._serializeReference();
    }
    return super.serialize({_isDeep, ...otherOptions});
  }

  static _serializeType() {
    return {_type: this.getName()};
  }

  _serializeId() {
    return {_id: this._id};
  }

  _serializeTypeAndId() {
    return {...this.constructor._serializeType(), ...this._serializeId()};
  }

  _serializeReference() {
    return {...this._serializeTypeAndId(), _ref: true};
  }

  static canBeSubmodel() {
    return false;
  }

  isOfType(name) {
    return name === 'Document' ? true : super.isOfType(name); // Optimization
  }
}
