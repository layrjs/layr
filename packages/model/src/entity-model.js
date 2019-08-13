import {IdentityModel} from './identity-model';

export class EntityModel extends IdentityModel {
  constructor(object, options) {
    super(object, options);

    this.constructor.setInstance(this);
  }

  serialize({target, fields, isDeep} = {}) {
    if (isDeep) {
      return this.serializeReference({target});
    }
    return super.serialize({target, fields, isDeep});
  }

  serializeReference({target} = {}) {
    if (this.isNew()) {
      throw new Error(`Cannot serialize a reference to a new entity`);
    }
    return {...super.serialize({target, fields: false, isDeep: true}), _ref: true};
  }

  getFailedValidators({fields, isDeep} = {}) {
    if (isDeep) {
      return undefined;
    }
    return super.getFailedValidators({fields, isDeep});
  }

  static getInstance(object, _previousInstance) {
    const id = object?._id;
    if (id === undefined) {
      throw new Error(`Entity 'id' is missing`);
    }
    return this._instances?.get(id);
  }

  static setInstance(instance) {
    const id = instance?._id;
    if (id === undefined) {
      throw new Error(`Entity 'id' is missing`);
    }
    if (!Object.prototype.hasOwnProperty.call(this, '_instances')) {
      this._instances = new Map(this._instances);
    }
    this._instances.set(id, instance);
  }
}
