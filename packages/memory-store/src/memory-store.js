import {getFromOneOrMany, callWithOneOrMany, mapFromOneOrMany} from '@storable/util';
import assert from 'assert';

export class MemoryStore {
  _collections = {};

  get(document, {return: returnFields = true} = {}) {
    return mapFromOneOrMany(document, ({_type, _id}) => {
      validateType(_type);
      validateId(_id);

      let document = this._collections[_type]?.[_id];

      if (document === undefined) {
        // Document not found
        return undefined;
      }

      document = this._getFields(document, returnFields, {rootType: _type, rootId: _id});

      return {_type, _id, ...document};
    });
  }

  _getFields(document, documentReturnFields, {rootType, rootId}) {
    const result = {};

    for (const [name, value] of Object.entries(document)) {
      let returnFields =
        typeof documentReturnFields === 'object' ?
          documentReturnFields[name] :
          documentReturnFields;

      if (returnFields === undefined || returnFields === false) {
        continue;
      }

      if (Array.isArray(value) && !(returnFields === true || Array.isArray(returnFields))) {
        throw new Error(
          `Type mismatch (collection: '${rootType}', id: '${rootId}', field: '${name}', expected: 'Boolean' or 'Array', provided: '${typeof returnFields}')`
        );
      }

      if (Array.isArray(returnFields)) {
        if (!Array.isArray(value)) {
          throw new Error(
            `Type mismatch (collection: '${rootType}', id: '${rootId}', field: '${name}', expected: 'Boolean' or 'Object', provided: 'Array')`
          );
        }
        returnFields = returnFields[0];
      }

      result[name] = mapFromOneOrMany(value, value => {
        assert(
          value !== null,
          `The 'null' value is not allowed (collection: '${rootType}', id: '${rootId}', field: '${name}')`
        );

        if (isPrimitive(value, {fieldName: name, rootType, rootId})) {
          if (returnFields !== true) {
            throw new Error(
              `Type mismatch (collection: '${rootType}', id: '${rootId}', field: '${name})', expected: 'Boolean', provided: '${typeof returnFields}'`
            );
          }
          return serializeValue(value);
        }

        if (isReference(value, {fieldName: name, rootType, rootId})) {
          const {_type, _id} = value;
          // Let's fetch the referenced document
          const document = this.get({_type, _id}, {return: returnFields});
          return {_type, _id, _ref: true, ...document};
        }

        // The value is a submodel or a subdocument
        let {_type, _id, ...document} = value;
        let result = {_type};
        if (_id !== undefined) {
          // The value is a subdocument
          result._id = _id;
        }
        document = this._getFields(document, returnFields, {rootType, rootId});
        result = {...result, ...document};
        return result;
      });
    }

    return result;
  }

  set(document) {
    return callWithOneOrMany(document, ({_isNew, _type, _id, _ref, ...fields}) => {
      validateType(_type);
      validateId(_id);

      if (_ref !== undefined) {
        throw new Error(
          `The '_ref' attribute cannot be specified at the root of a document (collection: '${_type}', id: '${_id}')`
        );
      }

      let collection = this._collections[_type];
      if (collection === undefined) {
        collection = {};
        this._collections[_type] = collection;
      }

      let document = collection[_id];
      if (document === undefined) {
        if (!_isNew) {
          throw new Error(`Document not found (collection: '${_type}', id: '${_id}')`);
        }
        document = {};
        collection[_id] = document;
      } else if (_isNew) {
        throw new Error(`Document already exists (collection: '${_type}', id: '${_id}')`);
      }

      this._setFields(document, fields, {rootType: _type, rootId: _id});
    });
  }

  _setFields(document, fields, {rootType, rootId}) {
    for (let [name, value] of Object.entries(fields)) {
      value = deserializeValue(value, {fieldName: name});

      if (value === undefined) {
        delete document[name];
        continue;
      }

      document[name] = mapFromOneOrMany(value, (value, index) => {
        value = deserializeValue(value, {fieldName: name});

        if (isPrimitive(value, {fieldName: name, rootType, rootId})) {
          return value;
        }

        if (isReference(value, {fieldName: name, rootType, rootId})) {
          const {_type, _id, _ref} = value;
          return {_type, _id, _ref};
        }

        // The value is a submodel or subdocument
        const {_isNew, _type, _id, ...fields} = value;
        validateType(_type);
        const submodel = {};
        if (!_isNew) {
          // TODO: We shouldn't read the existing submodel
          const previousSubmodel = getFromOneOrMany(document[name], index);
          Object.assign(submodel, previousSubmodel);
        }
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
  }

  delete(document) {
    return mapFromOneOrMany(document, ({_type, _id}) => {
      validateType(_type);
      validateId(_id);
      const document = this._collections[_type]?.[_id];
      if (document === undefined) {
        return false;
      }
      delete this._collections[_type][_id];
      return true;
    });
  }

  find({_type, ...filter}, {sort, skip, limit, return: returnFields = true} = {}) {
    validateType(_type);

    let results = [];

    const collection = this._collections[_type];

    if (collection === undefined) {
      return results;
    }

    for (let [_id, document] of Object.entries(collection)) {
      if (!Object.entries(filter).every(([name, value]) => document[name] === value)) {
        continue;
      }
      document = this._getFields(document, returnFields, {rootType: _type, rootId: _id});
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
    return undefined;
  }

  if (typeof value === 'object' && value._type === 'undefined') {
    return undefined;
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
    const {_isNew, _id, _ref} = value;
    if (_isNew !== undefined || _id !== undefined || _ref !== undefined) {
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
  if (isPrimitive(value, {fieldName, rootType, rootId})) {
    return false;
  }

  const {_isNew, _type, _id, _ref} = value;
  if (_ref === true) {
    validateType(_type);
    validateId(_id);
    if (_isNew !== undefined) {
      throw new Error(
        `A reference cannot include the '_isNew' attribute (collection: '${rootType}', id: '${rootId}', field: '${fieldName}')`
      );
    }
    return true;
  }

  // The value is a submodel or a subdocument
  return false;
}
