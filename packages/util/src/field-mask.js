import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';

export class FieldMask {
  constructor(fields) {
    if (fields instanceof FieldMask) {
      return fields;
    }

    this._fields = this.constructor._normalize(fields);
  }

  static _normalize(fields, {_isDeep} = {}) {
    if (fields === undefined) {
      return !_isDeep;
    }

    if (fields === false) {
      if (!_isDeep) {
        throw new Error(`A 'false' boolean cannot be the root of a field mask`);
      }
      return false;
    }

    if (fields === true) {
      return true;
    }

    if (Array.isArray(fields)) {
      if (!_isDeep) {
        throw new Error(`An array cannot be the root of a field mask`);
      }
      return this._normalize(fields[0]);
    }

    if (typeof fields === 'object') {
      const normalizedFields = {};
      for (const [name, subfields] of Object.entries(fields)) {
        const normalizedSubfields = this._normalize(subfields, {_isDeep: true});
        if (normalizedSubfields !== false) {
          normalizedFields[name] = normalizedSubfields;
        }
      }
      return normalizedFields;
    }

    throw new Error(
      `Type mismatch found in a field mask. Expected: 'true' or an object, but received '${typeof fields}'`
    );
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

    if (this._fields === true) {
      return this;
    }

    const subfields = this._fields[name];

    if (subfields === false || subfields === undefined) {
      return false;
    }

    return new FieldMask(subfields);
  }

  static isEqual(fields, otherFields) {
    fields = new FieldMask(fields);
    otherFields = new FieldMask(otherFields);
    return isEqual(fields._fields, otherFields._fields);
  }

  static merge(fields, otherFields) {
    fields = new FieldMask(fields);
    otherFields = new FieldMask(otherFields);
    return new FieldMask(this._merge(fields._fields, otherFields._fields));
  }

  static _merge(fields, otherFields) {
    if (fields === true) {
      return fields;
    }
    if (otherFields === true) {
      return otherFields;
    }
    if (fields === false || fields === undefined) {
      return otherFields;
    }
    if (otherFields === false || otherFields === undefined) {
      return fields;
    }

    const mergedFields = {};
    const fieldNames = new Set([...Object.keys(fields), ...Object.keys(otherFields)]);
    for (const name of fieldNames) {
      const subfields = fields[name];
      const otherSubfields = otherFields[name];
      const mergedSubfields = this._merge(subfields, otherSubfields);
      if (!(mergedSubfields === false || mergedSubfields === undefined)) {
        mergedFields[name] = mergedSubfields;
      }
    }
    return mergedFields;
  }
}
