import mapValues from 'lodash/mapValues';
import isEmpty from 'lodash/isEmpty';
import ow from 'ow';

import {getTypeOf} from './utilities';

export class Mask {
  constructor(object = {}) {
    ow(object, 'object', ow.object);

    if (isMask(object)) {
      return object.clone();
    }

    this._value = mapValues(object, normalizeValue);
  }

  get(name) {
    ow(name, 'name', ow.string.nonEmpty);

    return this._value[name];
  }

  has(name) {
    ow(name, 'name', ow.string.nonEmpty);

    return this._value[name] !== undefined;
  }

  set(name, value) {
    ow(name, 'name', ow.string.nonEmpty);

    value = normalizeValue(value);

    this._set(name, value);
  }

  _set(name, value) {
    this._value[name] = value;
  }

  unset(name) {
    ow(name, 'name', ow.string.nonEmpty);

    delete this._value[name];
  }

  entries() {
    return Object.entries(this._value);
  }

  isEmpty() {
    return isEmpty(this._value);
  }

  toJSON() {
    return this._value;
  }

  clone() {
    const clonedMask = new Mask();

    for (const [name, value] of this.entries()) {
      clonedMask.set(name, value);
    }

    return clonedMask;
  }

  isEqual(other) {
    other = normalizeMask(other);

    return other === this || (this._includes(other) && other._includes(this));
  }

  includes(other) {
    other = normalizeMask(other);

    return other === this || this._includes(other);
  }

  _includes(other) {
    for (const [name, otherValue] of other.entries()) {
      const value = this.get(name);

      if (value === undefined) {
        return false;
      }

      if (value === true) {
        continue;
      }

      if (!(isMask(otherValue) && value._includes(otherValue))) {
        return false;
      }
    }

    return true;
  }

  add(other) {
    other = normalizeMask(other);

    return this._add(other);
  }

  _add(other) {
    for (const [name, otherValue] of other.entries()) {
      const value = this.get(name);

      if (value === undefined || otherValue === true) {
        this.set(name, otherValue);
      } else if (value === true) {
        // NOOP
      } else {
        value._add(otherValue);
      }
    }

    return this;
  }

  remove(other) {
    other = normalizeMask(other);

    return this._remove(other);
  }

  _remove(other) {
    for (const [name, otherValue] of other.entries()) {
      const value = this.get(name);

      if (value === undefined) {
        // NOOP
      } else if (otherValue === true) {
        this.unset(name);
      } else {
        if (value === true) {
          throw new Error("Cannot remove an 'object mask' from a 'true mask'");
        }
        value._remove(otherValue);
      }
    }

    return this;
  }

  static isMask(object) {
    return isMask(object);
  }
}

export function isMask(object) {
  return typeof object?.constructor?.isMask === 'function';
}

function normalizeMask(object) {
  ow(object, 'object', ow.object);

  if (isMask(object)) {
    return object;
  }

  return new Mask(object);
}

function normalizeValue(value) {
  if (value === true) {
    return true;
  }

  if (isMask(value)) {
    return value.clone();
  }

  if (typeof value === 'object' && value !== null) {
    return new Mask(value);
  }

  throw new Error(
    `Unexpected type encountered while normalizing a mask value (expected type: 'true' or 'object', received type: '${getTypeOf(
      value
    )}')`
  );
}
