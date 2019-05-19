import {IdentityModel} from './identity-model';

export class EntityModel extends IdentityModel {
  constructor(object, options) {
    super(object, options);

    this.constructor.setInstance(this);
  }

  static _normalizeFieldMask(fieldMask, {_isRoot} = {}) {
    if (!_isRoot) {
      return {};
    }
    return super._normalizeFieldMask(fieldMask, {_isRoot});
  }

  // serialize({_isDeep, ...otherOptions} = {}) {
  //   if (_isDeep) {
  //     return this._serializeReference();
  //   }
  //   return super.serialize({_isDeep, ...otherOptions});
  // }

  // static _serializeType() {
  //   return {_type: this.getRegisteredName()};
  // }

  // _serializeId() {
  //   return {_id: this._id};
  // }

  // _serializeTypeAndId() {
  //   return {...this.constructor._serializeType(), ...this._serializeId()};
  // }

  // _serializeReference() {
  //   return this.serialize({fieldFilter: () => false});
  // }

  static getInstance(object, _previousInstance) {
    const id = object?._id;
    if (id !== undefined) {
      return this.getEntity(id);
    }
  }

  static setInstance(instance) {
    this.setEntity(instance._id, instance);
  }

  static getEntity(id) {
    return this._entities?.get(id);
  }

  static setEntity(id, entity) {
    if (!Object.prototype.hasOwnProperty.call(this, '_entities')) {
      this._entities = new Map(this._entities);
    }
    this._entities.set(id, entity);
  }

  // release() {
  //   this.constructor.setEntity(this._id, undefined);
  // }
}
