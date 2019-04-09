import {BaseDocument} from './base-document';

export class Document extends BaseDocument {
  serialize({filter, _level = 0} = {}) {
    if (_level > 0) {
      // It is a referenced document
      return this._serializeReference();
    }
    if (filter) {
      const originalFilter = filter;
      filter = (model, field) => {
        if (field.name === 'id') {
          // The 'id' field cannot be filtered out
          return true;
        }
        return originalFilter(model, field);
      };
    }
    return super.serialize({filter, _level});
  }

  static _serializeType() {
    return {_type: this.getName()};
  }

  _serializeId() {
    return {_id: this.id};
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
