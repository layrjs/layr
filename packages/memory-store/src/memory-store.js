export class MemoryStore {
  _collections = {};

  get({_type, _id}, {return: returnFields} = {}) {
    validateType(_type);
    validateId(_id);

    const document = this._collections[_type]?.[_id];

    if (document === undefined) {
      return undefined;
    }

    if (returnFields === undefined) {
      return {_type, _id, ...document};
    }

    const result = {};
    for (const [name, value] of Object.entries(returnFields)) {
      if (!value) {
        continue;
      }
      if (name === '_type') {
        result._type = _type;
      } else if (name === '_id') {
        result._id = _id;
      } else {
        const fieldValue = document[name];
        if (fieldValue !== undefined) {
          result[name] = fieldValue;
        }
      }
    }
    return result;
  }

  set({_type, _id, ...changes}) {
    validateType(_type);
    validateId(_id);

    let collection = this._collections[_type];
    if (collection === undefined) {
      collection = {};
      this._collections[_type] = collection;
    }

    let document = collection[_id];
    if (document === undefined) {
      document = {};
      collection[_id] = document;
    }

    for (const [name, value] of Object.entries(changes)) {
      if (value !== undefined) {
        document[name] = value;
      } else {
        delete document[name];
      }
    }
  }

  delete({_type, _id}) {
    validateType(_type);
    validateId(_id);

    const document = this._collections[_type]?.[_id];
    if (document === undefined) {
      return false;
    }
    delete this._collections[_type][_id];
    return true;
  }
}

function validateType(_type) {
  if (typeof _type !== 'string') {
    throw new Error(`'_type' must be a string (provided type: ${typeof _type}`);
  }

  if (_type === '') {
    throw new Error(`'_type' cannot be empty`);
  }
}

function validateId(_id) {
  if (typeof _id !== 'string') {
    throw new Error(`'_id' must be a string (provided type: ${typeof _id}`);
  }

  if (_id === '') {
    throw new Error(`'_id' cannot be empty`);
  }
}
