import {inspect} from 'util';
import cuid from 'cuid';
import {findFromOneOrMany} from '@layr/util';

import {Model} from './model';

export class IdentityModel extends Model {
  constructor(object = {}, {deserialize, ...options} = {}) {
    super(object, {deserialize, ...options});

    if (deserialize) {
      return;
    }

    let id = object.id;
    if (id !== undefined) {
      this.constructor.validateId(id);
    } else {
      id = this.constructor.generateId();
    }
    this._id = id;
  }

  serialize(options) {
    const {_type, _new, ...fields} = super.serialize(options);
    return {_type, ...(_new && {_new}), _id: this._id, ...fields};
  }

  deserialize(object = {}, options) {
    super.deserialize(object, options);
    this._id = object._id;
  }

  static getInstance(object, previousInstance) {
    return findFromOneOrMany(
      previousInstance,
      previousInstance =>
        previousInstance?.constructor === this && previousInstance._id === object?._id
    );
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
