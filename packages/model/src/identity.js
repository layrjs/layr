import {inspect} from 'util';
import cuid from 'cuid';
import isEmpty from 'lodash/isEmpty';
import {findFromOneOrMany} from '@liaison/util';

import {Model} from './model';

export class Identity extends Model {
  constructor(object = {}, {isDeserializing} = {}) {
    super(object, {isDeserializing});

    if (isDeserializing) {
      return;
    }

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
    const layerName = this.$getLayer({throwIfNotFound: false})?.getName();

    if (layerName !== undefined && target === layerName) {
      target = undefined;
    }

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
        const idSource = this.$getIdSource();
        if (idSource !== layerName) {
          sources._id = idSource;
        }
      }
    }

    if (!isEmpty(sources)) {
      serializedIdentity._src = sources;
    }

    return {...serializedIdentity, ...otherProps};
  }

  $deserialize(object = {}, {source, ...otherOptions} = {}) {
    const layerName = this.$getLayer({throwIfNotFound: false})?.getName();

    if (layerName !== undefined && source === layerName) {
      source = undefined;
    }

    const deserializedIdentity = super.$deserialize(object, {source, ...otherOptions});

    const id = object._id;
    if (id !== undefined) {
      const idSource = source === undefined ? object._src?._id : source;
      this.__setId(id, {source: idSource});
    }

    return deserializedIdentity;
  }

  static $getInstance(object, previousInstance) {
    return findFromOneOrMany(
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
      throw new Error(`Cannot change the id an Identity instance`);
    }

    this.__idSource = source;
  }

  // eslint-disable-next-line no-unused-vars
  __onIdValueSet(value) {
    // Overridden in Entity to update id index
  }

  $getIdSource() {
    if (this._id === undefined) {
      return undefined;
    }

    let source = this.__idSource;
    if (source === undefined) {
      source = this.$getLayer().getName();
    }

    return source;
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
