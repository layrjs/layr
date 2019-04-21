export class FieldMask {
  constructor(fields) {
    if (fields instanceof FieldMask) {
      return fields;
    }
    this._fields = normalize(fields);
  }

  get(name) {
    let fields = this._fields;
    if (typeof fields === 'object') {
      fields = fields[name];
    }
    if (Array.isArray(fields)) {
      fields = fields[0];
    }
    if (fields === false || fields === undefined) {
      return false;
    }
    return new FieldMask(fields);
  }

  toJSON() {
    return this._fields;
  }
}

function normalize(fields) {
  if (fields === undefined) {
    return true;
  }

  if (typeof fields === 'boolean') {
    return fields;
  }

  if (typeof fields === 'object') {
    if (Array.isArray(fields)) {
      throw new Error(`An array cannot be the root of a field mask`);
    }
    return fields;
  }

  throw new Error(
    `Type mismatch found in a field mask. Expected: 'true' or an object, but received '${typeof fields}'`
  );
}
