import {inspect} from 'util';
import cuid from 'cuid';
import {findFromOneOrMany} from '@liaison/util';

import {Model} from './model';

export class Identity extends Model {
  constructor(object = {}, {isDeserializing} = {}) {
    super(object, {isDeserializing});

    let id;
    if (isDeserializing) {
      id = object._id;
      if (id !== undefined) {
        this.constructor.validateId(id);
      }
    } else {
      id = object.id;
      if (id !== undefined) {
        this.constructor.validateId(id);
      } else {
        id = this.constructor.generateId();
      }
    }

    this._id = id;
  }

  serialize({target, fields, isDeep} = {}) {
    const {_type, _new, ...otherProps} = super.serialize({target, fields, isDeep});
    return {_type, ...(_new && {_new}), _id: this._id, ...otherProps};
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
}
