import {IdentityModel} from './identity-model';

export class EntityModel extends IdentityModel {
  constructor(object, options) {
    super(object, options);

    this.constructor.setInstance(this);
  }

  serialize({target, fields, isDeep} = {}) {
    return super.serialize({target, fields: isDeep ? false : fields, isDeep});
  }

  getFailedValidators({fields, isDeep} = {}) {
    if (isDeep) {
      return undefined;
    }
    return super.getFailedValidators({fields, isDeep});
  }

  // serialize({isDeep, ...otherOptions} = {}) {
  //   if (isDeep) {
  //     return this._serializeReference();
  //   }
  //   return super.serialize({isDeep, ...otherOptions});
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
      return this._instances?.get(id);
    }
  }

  static setInstance(instance) {
    if (!Object.prototype.hasOwnProperty.call(this, '_instances')) {
      this._instances = new Map(this._instances);
    }
    this._instances.set(instance._id, instance);
  }

  // release() {
  //   this.constructor.setEntity(this._id, undefined);
  // }
}
