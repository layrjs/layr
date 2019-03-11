import isEmpty from 'lodash/isEmpty';

export class MemoryStore {
  _collections = {};

  get({_type, _id}, {return: returnFields = true} = {}) {
    validateType(_type);
    validateId(_id);

    const document = this._collections[_type]?.[_id];

    if (document === undefined) {
      return undefined;
    }

    const result = {_type, _id};

    if (returnFields === false) {
      return result;
    }

    for (const [name, value] of Object.entries(document)) {
      const returnField = typeof returnFields === 'object' ? returnFields[name] : true;

      if (returnField === undefined || returnField === false) {
        continue;
      }

      if (typeof value !== 'object' || value === null) {
        if (returnField !== true) {
          throw new Error(
            `Type mismatch (field name: '${name})', expected value: 'true', actual type: '${typeof returnField}'`
          );
        }
        result[name] = value;
        continue;
      }

      const subdocument = value;

      if (subdocument._id === undefined) {
        if (returnField !== true) {
          throw new Error(
            `It is not possible to partially return nested documents (field name: '${name})'`
          );
        }
        result[name] = subdocument;
        continue;
      }

      result[name] = this.get(subdocument, {return: returnField});
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
      if (value === undefined) {
        delete document[name];
        continue;
      }

      if (typeof value !== 'object' || value === null) {
        document[name] = value;
        continue;
      }

      const subdocument = value;

      if (subdocument._id === undefined) {
        document[name] = subdocument;
        continue;
      }

      const {_type, _id, ...changes} = subdocument;

      validateType(_type);
      validateId(_id);

      if (!isEmpty(changes)) {
        this.set(subdocument);
      }

      document[name] = {_type, _id};
    }
  }

  delete({_type, _id, ...referencedDocuments}) {
    validateType(_type);
    validateId(_id);

    const result = {};

    // Let's handle the referenced documents first
    for (const [name, referencedDocument] of Object.entries(referencedDocuments)) {
      if (referencedDocument === undefined) {
        continue;
      }

      if (referencedDocument === null) {
        throw new Error(
          `Type mismatch (field name: '${name})', expected type: 'object', actual type: 'null'`
        );
      }

      if (typeof referencedDocument !== 'object') {
        throw new Error(
          `Type mismatch (field name: '${name})', expected type: 'object', actual type: '${typeof referencedDocument}'`
        );
      }

      result[name] = this.delete(referencedDocument);
    }

    const document = this._collections[_type]?.[_id];
    if (document === undefined) {
      return result;
    }

    // Delete the specified document
    delete this._collections[_type][_id];

    return {_type, _id, ...result};
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
