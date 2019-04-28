import {IdentityModel} from './identity-model';

export class Entity extends IdentityModel {
  constructor(object, options) {
    super(object, options);

    this.constructor.setEntity(this._id, this);
  }

  serialize({_isDeep, ...otherOptions} = {}) {
    if (_isDeep) {
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

  static _findExistingInstance(object, {previousInstance: _previousInstance}) {
    const id = object?._id;
    if (id !== undefined) {
      const entity = this.getEntity(id);
      if (entity) {
        return entity;
      }
    }
  }

  static getEntity(id) {
    return this._entities?.[id];
  }

  static setEntity(id, entity) {
    if (!Object.prototype.hasOwnProperty.call(this, '_entities')) {
      this._entities = Object.create(this._entities || {});
    }
    this._entities[id] = entity;
  }

  release() {
    this.constructor.setEntity(this._id, undefined);
  }

  isOfType(name) {
    return name === 'Entity' ? true : super.isOfType(name); // Optimization
  }
}
