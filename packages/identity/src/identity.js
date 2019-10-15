import {Model} from '@liaison/model';
import {possiblyMany} from 'possibly-many';
import {inspect} from 'util';
import cuid from 'cuid';
import isEmpty from 'lodash/isEmpty';

export class Identity extends Model {
  constructor(object = {}) {
    super(object);

    let id = object.id;
    if (id === undefined) {
      id = this.constructor.$generateId();
    }

    this.__setId(id, {source: undefined});
  }

  __assignOther(other) {
    this.$deserialize({...other.$serialize(), _id: undefined, _src: undefined});
  }

  $serialize({target, fields} = {}) {
    const {_type, _new: isNew, _src: sources = {}, ...otherProps} = super.$serialize({
      target,
      fields
    });

    const serializedIdentity = {_type};

    if (isNew) {
      serializedIdentity._new = true;
    }

    const id = this._id;
    if (id !== undefined) {
      serializedIdentity._id = id;

      if (target === undefined) {
        if (this.__idSource !== undefined) {
          sources._id = this.__idSource;
        }
      }
    }

    if (!isEmpty(sources)) {
      serializedIdentity._src = sources;
    }

    return {...serializedIdentity, ...otherProps};
  }

  $deserialize(object = {}, {source, ...otherOptions} = {}) {
    const id = object._id;
    if (id !== undefined) {
      const idSource = source === undefined ? object._src?._id : source;
      this.__setId(id, {source: idSource});
    }

    return super.$deserialize(object, {source, ...otherOptions});
  }

  static $getInstance(object, previousInstance) {
    return possiblyMany.find(
      previousInstance,
      previousInstance =>
        previousInstance?.constructor === this && previousInstance._id === object?._id
    );
  }

  get id() {
    return this._id;
  }

  __setId(id, {source}) {
    this.constructor.validateId(id);

    if (this._id === undefined) {
      this._id = id;
      this.__onIdValueSet(id);
    } else if (this._id !== id) {
      throw new Error(`Cannot change the id of an Identity instance`);
    }

    this.__idSource = source;
  }

  // eslint-disable-next-line no-unused-vars
  __onIdValueSet(value) {
    // Overridden in Entity to update id index
  }

  $getIdSource() {
    return this.__idSource;
  }

  static $generateId() {
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

  static $isIdentity(object) {
    return isIdentity(object);
  }

  [inspect.custom]() {
    return {id: this._id, ...super[inspect.custom]()};
  }
}

export function isIdentity(object) {
  return typeof object?.constructor?.$isIdentity === 'function';
}
