import {FieldMask, getFromOneOrMany, mapFromOneOrMany} from '@storable/util';
import assert from 'assert';

export class MemoryStore {
  _collections = {};

  get(documents, {fields, throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return this.get([documents], {fields, throwIfNotFound})[0];
    }

    fields = new FieldMask(fields);

    return documents.map(({_type, _id}) => {
      validateType(_type);
      validateId(_id);

      let document = this._collections[_type]?.[_id];

      if (document === undefined) {
        if (throwIfNotFound) {
          throw new Error(`Document not found (collection: '${_type}', id: '${_id}')`);
        }
        return undefined;
      }

      document = this._getFields(document, fields, {rootType: _type, rootId: _id});

      return {_type, _id, ...document};
    });
  }

  _getFields(document, rootFields, {rootType, rootId}) {
    const result = {};

    for (const [name, value] of Object.entries(document)) {
      const fields = rootFields.get(name);

      if (!fields) {
        continue;
      }

      result[name] = mapFromOneOrMany(value, value => {
        assert(
          value !== null,
          `The 'null' value is not allowed (collection: '${rootType}', id: '${rootId}', field: '${name}')`
        );

        if (isPrimitive(value, {fieldName: name, rootType, rootId})) {
          return serializeValue(value);
        }

        if (isReference(value, {fieldName: name, rootType, rootId})) {
          return value;
        }

        // The value is a submodel or a subdocument
        let {_type, _id, ...document} = value;
        let result = {_type};
        if (_id !== undefined) {
          // The value is a subdocument
          result._id = _id;
        }
        document = this._getFields(document, fields, {rootType, rootId});
        result = {...result, ...document};
        return result;
      });
    }

    return result;
  }

  set(documents) {
    if (!Array.isArray(documents)) {
      this.set([documents]);
      return;
    }

    documents.forEach(({_new, _type, _id, _ref, _remote, ...fields}) => {
      validateType(_type);
      validateId(_id);
      if (_ref !== undefined) {
        throw new Error(
          `The '_ref' attribute cannot be specified at the root of a document (collection: '${_type}', id: '${_id}')`
        );
      }
      if (_remote !== undefined) {
        throw new Error(
          `The '_remote' attribute cannot be specified at the root of a document (collection: '${_type}', id: '${_id}')`
        );
      }

      let collection = this._collections[_type];
      if (collection === undefined) {
        collection = {};
        this._collections[_type] = collection;
      }

      let document = collection[_id];
      if (document === undefined) {
        if (!_new) {
          throw new Error(`Document not found (collection: '${_type}', id: '${_id}')`);
        }
        document = {};
        collection[_id] = document;
      } else if (_new) {
        throw new Error(`Document already exists (collection: '${_type}', id: '${_id}')`);
      }

      this._setFields(document, fields, {rootType: _type, rootId: _id});
    });
  }

  _setFields(document, {_undefined: undefinedFields, ...definedFields}, {rootType, rootId}) {
    for (let [name, value] of Object.entries(definedFields)) {
      value = deserializeValue(value, {fieldName: name});

      document[name] = mapFromOneOrMany(value, (value, index) => {
        value = deserializeValue(value, {fieldName: name});

        if (isPrimitive(value, {fieldName: name, rootType, rootId})) {
          return value;
        }

        if (isReference(value, {fieldName: name, rootType, rootId})) {
          return value;
        }

        // The value is a submodel or subdocument
        const {_new, _type, _id, ...fields} = value;
        validateType(_type);
        const submodel = _new ? {} : getFromOneOrMany(document[name], index);
        submodel._type = _type;
        if (_id !== undefined) {
          // The value is a subdocument
          validateId(_id);
          submodel._id = _id;
        }
        this._setFields(submodel, fields, {rootType, rootId});
        return submodel;
      });
    }

    if (undefinedFields) {
      for (const name of undefinedFields) {
        delete document[name];
      }
    }
  }

  delete(documents, {throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return this.delete([documents], {throwIfNotFound})[0];
    }

    return documents.map(({_type, _id}) => {
      validateType(_type);
      validateId(_id);
      const document = this._collections[_type]?.[_id];
      if (document === undefined) {
        if (throwIfNotFound) {
          throw new Error(`Document not found (collection: '${_type}', id: '${_id}')`);
        }
        return false;
      }
      delete this._collections[_type][_id];
      return true;
    });
  }

  // TODO: find() should return ids only?
  find({_type, ...filter}, {sort, skip, limit, fields} = {}) {
    validateType(_type);
    fields = new FieldMask(fields);

    let results = [];

    const collection = this._collections[_type];

    if (collection === undefined) {
      return results;
    }

    for (let [_id, document] of Object.entries(collection)) {
      if (!Object.entries(filter).every(([name, value]) => document[name] === value)) {
        continue;
      }
      document = this._getFields(document, fields, {rootType: _type, rootId: _id});
      results.push({_type, _id, ...document});
    }

    if (sort !== undefined) {
      throw new Error(`The 'sort' option is not implemented yet`);
    }

    if (skip !== undefined) {
      results = results.slice(skip);
    }

    if (limit !== undefined) {
      results = results.slice(0, limit);
    }

    return results;
  }
}

function validateType(_type) {
  if (typeof _type !== 'string') {
    throw new Error(`'_type' must be a string (provided: ${typeof _type})`);
  }
  if (_type === '') {
    throw new Error(`'_type' cannot be empty`);
  }
}

function validateId(_id) {
  if (typeof _id !== 'string') {
    throw new Error(`'_id' must be a string (provided: ${typeof _id})`);
  }
  if (_id === '') {
    throw new Error(`'_id' cannot be empty`);
  }
}

function serializeValue(value) {
  if (value instanceof Date) {
    return {_type: 'Date', _value: value.toISOString()};
  }
  return value;
}

function deserializeValue(value, {fieldName}) {
  if (value === null) {
    throw new Error(`The 'null' value is not allowed (field: '${fieldName}')`);
  }

  if (value === undefined) {
    throw new Error(`The 'undefined' value is not allowed (field: '${fieldName}')`);
  }

  if (typeof value === 'object' && value._type === 'Date') {
    return new Date(value._value);
  }

  return value;
}

function isPrimitive(value, {fieldName, rootType, rootId}) {
  if (typeof value !== 'object' || value instanceof Date) {
    return true;
  }

  if (value._type === undefined) {
    // The value is a plain object
    const {_new, _id, _ref, _remote, _undefined} = value;
    if (
      _new !== undefined ||
      _id !== undefined ||
      _ref !== undefined ||
      _remote !== undefined ||
      _undefined !== undefined
    ) {
      throw new Error(
        `A plain object value cannot include a reserved attribute (collection: '${rootType}', id: '${rootId}', field: '${fieldName}')`
      );
    }
    return true;
  }

  // The value is a submodel, a subdocument or a reference
  return false;
}

function isReference(value, {fieldName, rootType, rootId}) {
  // IMPORTANT: Make sure to call isPrimitive() before isReference()
  const {_type, _id, _ref, _remote, ...fields} = value;
  if (_ref === true) {
    validateType(_type);
    validateId(_id);
    if (Object.keys(fields).length) {
      throw new Error(
        `A reference cannot include fields (collection: '${rootType}', id: '${rootId}', field: '${fieldName}')`
      );
    }
    return true;
  }

  // The value is a submodel or a subdocument
  return false;
}
