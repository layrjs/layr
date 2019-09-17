import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';

export class FieldMask {
  constructor(fields = {}) {
    if (typeof fields !== 'object') {
      throw new Error(`Expected an object (received: ${typeof fields})`);
    }

    this._fields = fields;
  }

  serialize() {
    return cloneDeep(this._fields);
  }

  toJSON() {
    return this.serialize();
  }

  get(name) {
    if (typeof name !== 'string' || name === '') {
      throw new Error(`The 'name' paramter must be a non empty string`);
    }

    const subfields = this._fields[name];

    if (subfields === undefined) {
      return false;
    }

    if (subfields === true) {
      return true;
    }

    return new FieldMask(subfields);
  }

  has(name) {
    if (typeof name !== 'string' || name === '') {
      throw new Error(`The 'name' paramter must be a non empty string`);
    }

    return this._fields[name] !== undefined;
  }

  includes(fields) {
    if (!FieldMask.isFieldMask(fields)) {
      throw new Error(`Expected a FieldMask (received: ${typeof fields})`);
    }

    function _includes(rootFields, rootOtherFields) {
      for (const [name, otherFields] of Object.entries(rootOtherFields)) {
        const fields = rootFields[name];
        if (fields === undefined) {
          return false;
        }
        if (typeof fields === 'object' && !_includes(fields, otherFields)) {
          return false;
        }
      }
      return true;
    }

    return _includes(this._fields, fields._fields);
  }

  static isEqual(fields, otherFields) {
    if (!this.isFieldMask(fields)) {
      throw new Error(`Expected a FieldMask (received: ${typeof fields})`);
    }

    if (!this.isFieldMask(otherFields)) {
      throw new Error(`Expected a FieldMask (received: ${typeof otherFields})`);
    }

    return isEqual(fields._fields, otherFields._fields);
  }

  static merge(fields, otherFields) {
    if (!this.isFieldMask(fields)) {
      throw new Error(`Expected a FieldMask (received: ${typeof fields})`);
    }

    if (!this.isFieldMask(otherFields)) {
      throw new Error(`Expected a FieldMask (received: ${typeof otherFields})`);
    }

    return new FieldMask(merge(fields._fields, otherFields._fields));
  }

  static isFieldMask(object) {
    return typeof object?.constructor.isFieldMask === 'function';
  }
}
