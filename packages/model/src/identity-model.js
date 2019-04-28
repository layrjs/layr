import {inspect} from 'util';
import cuid from 'cuid';
import {findFromOneOrMany} from '@storable/util';

import {Model} from './model';

export class IdentityModel extends Model {
  constructor(object, options) {
    super(object, options);

    const idKey = options?.deserialize ? '_id' : 'id';
    this._id = object?.[idKey] || this.constructor.generateId();
  }

  serialize(options) {
    const {_new, _type, ...fields} = super.serialize(options);
    return {...(_new && {_new}), _type, _id: this._id, ...fields};
  }

  static _findExistingInstance(object, {previousInstance}) {
    const foundInstance = findFromOneOrMany(
      previousInstance,
      previousInstance =>
        previousInstance?.constructor === this && previousInstance._id === object?._id
    );
    if (foundInstance) {
      return foundInstance;
    }
  }

  get id() {
    return this._id;
  }

  static generateId() {
    return cuid();
  }

  static validateId(id) {
    if (typeof id !== 'string') {
      throw new Error(`'id' must be a string (provided: ${typeof id})`);
    }
    if (id === '') {
      throw new Error(`'id' cannot be empty`);
    }
  }

  [inspect.custom]() {
    return {id: this._id, ...super[inspect.custom]()};
  }

  isOfType(name) {
    return name === 'IdentityModel' ? true : super.isOfType(name); // Optimization
  }
}
