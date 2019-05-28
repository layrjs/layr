import {inspect} from 'util';
import nanoid from 'nanoid';
import {invokeQuery} from '@deepr/runtime';
import {syncOrAsync} from '@deepr/util';
import debugModule from 'debug';

import {isRegisterable} from './registerable';
import {isSerializable} from './serializable';

const debug = debugModule('layr');
// To display the debug log, set this environment:
// DEBUG=layr DEBUG_DEPTH=10

export class Layer {
  constructor(registerables, {name, parent} = {}) {
    this._registeredNames = [];
    this._registerables = {};

    if (registerables) {
      this.register(registerables);
    }
    if (name) {
      this.setName(name);
    }
    if (parent) {
      this.setParent(parent);
    }
  }

  getId() {
    if (!this._id) {
      this._id = nanoid();
    }
    return this._id;
  }

  getName() {
    return this._name;
  }

  setName(name) {
    if (typeof name !== 'string' || name === '') {
      throw new Error(`Expected a non-empty string for the name of the layer`);
    }

    this._name = name;
  }

  // === Registration ===

  get(name, {throwIfNotFound = true} = {}) {
    if (this._registeredNames.includes(name)) {
      return this[name];
    }
    if (throwIfNotFound) {
      throw new Error(`Item not found in the layer (name: '${name}')`);
    }
  }

  register(registerables) {
    if (typeof registerables !== 'object') {
      throw new Error(`Expected an object (received: ${typeof registerables})`);
    }

    for (const [name, registerable] of Object.entries(registerables)) {
      this._register(name, registerable);
    }
  }

  _register(name, registerable) {
    if (!isRegisterable(registerable)) {
      throw new Error(`Expected a registerable`);
    }

    if (registerable.getLayer({fallBackToClass: false, throwIfNotFound: false})) {
      throw new Error(`Registerable already registered (name: '${name}')`);
    }

    if (this._registeredNames.includes(name)) {
      throw new Error(`Name already registered (name: '${name}')`);
    }

    const forkedRegisterable = this.__register(name, registerable);

    forkedRegisterable.setRegisteredName(name);

    this._registeredNames.push(name);

    Object.defineProperty(this, name, {
      get() {
        let registerable = this._registerables[name];
        if (!Object.prototype.hasOwnProperty.call(this._registerables, name)) {
          registerable = this.__register(name, registerable);
        }
        return registerable;
      }
    });
  }

  __register(name, registerable) {
    const forkedRegisterable = registerable.fork();
    forkedRegisterable.setLayer(this);
    this._registerables[name] = forkedRegisterable;
    return forkedRegisterable;
  }

  // === Forking ===

  fork(registerables) {
    const forkedLayer = Object.create(this);
    forkedLayer._registeredNames = [...this._registeredNames];
    forkedLayer._registerables = Object.create(this._registerables);
    if (registerables) {
      forkedLayer.register(registerables);
    }
    return forkedLayer;
  }

  // === Serialization ===

  serialize(value) {
    if (value === null) {
      throw new Error(`The 'null' value is not allowed`);
    }

    if (Array.isArray(value)) {
      return this._serializeArray(value);
    }

    if (typeof value === 'object') {
      return this._serializeObject(value);
    }

    return value;
  }

  _serializeArray(array) {
    return array.map(item => this.serialize(item));
  }

  _serializeObject(object) {
    if (isSerializable(object)) {
      return object.serialize(object);
    }

    const primitiveType = getPrimitiveTypeFromValue(object);
    if (primitiveType) {
      return primitiveType.serialize(object);
    }

    if (typeof object.toJSON === 'function') {
      return object.toJSON();
    }

    return this._serializePlainObject(object);
  }

  _serializePlainObject(object) {
    const serializedObject = {};
    for (const [key, value] of Object.entries(object)) {
      serializedObject[key] = this.serialize(value);
    }
    return serializedObject;
  }

  deserialize(value) {
    if (value === null) {
      throw new Error(`The 'null' value is not allowed`);
    }

    if (Array.isArray(value)) {
      return this._deserializeArray(value);
    }

    if (typeof value === 'object') {
      return this._deserializeObject(value);
    }

    return value;
  }

  _deserializeArray(array) {
    return array.map(item => this.deserialize(item));
  }

  _deserializeObject(object) {
    if (this._isTypedObject(object)) {
      return this._deserializeTypedObject(object);
    }

    return this._deserializePlainObject(object);
  }

  _isTypedObject(object) {
    return object._type !== undefined;
  }

  _deserializeTypedObject(object) {
    const type = object._type;

    const primitiveType = getPrimitiveType(type);
    if (primitiveType) {
      return primitiveType.deserialize(object);
    }

    const Class = this.get(type);
    return Class.deserialize(object);
  }

  _deserializePlainObject(object) {
    const deserializedObject = {};
    for (const [key, value] of Object.entries(object)) {
      deserializedObject[key] = this.deserialize(value);
    }
    return deserializedObject;
  }

  // === Parent layer ===

  getParent({throwIfNotFound = true} = {}) {
    if (this._parent) {
      return this._parent;
    }
    if (throwIfNotFound) {
      throw new Error(`Parent layer not found`);
    }
  }

  setParent(parent) {
    this._parent = parent;
  }

  hasParent() {
    return this._parent !== undefined;
  }

  sendQuery(query) {
    const parent = this.getParent();
    const source = this.getId();
    const target = parent.getId();

    query = this.serialize(query, {target});
    debug(`[%s → %s] %o`, source, target, query);
    return syncOrAsync(parent.receiveQuery(query, {source}), result => {
      debug(`[%s ← %s] %o`, source, target, result);
      result = this.deserialize(result, {source: target});
      return result;
    });
  }

  receiveQuery(query, {source} = {}) {
    const target = this.getId();
    debug(`[%s → %s] %o)`, source, target, query);
    query = this.deserialize(query, {source});
    return syncOrAsync(this.invokeQuery(query), result => {
      result = this.serialize(result, {target: source});
      debug(`[%s ← %s] %o`, source, target, result);
      return result;
    });
  }

  invokeQuery(query) {
    return invokeQuery(this, query);
  }

  // === Utilities ===

  [inspect.custom]() {
    const registerables = {};
    for (const name of this._registeredNames) {
      registerables[name] = this._registerables[name];
    }
    return registerables;
  }
}

const _primitiveTypes = {
  Date: {
    serialize(date) {
      return {_type: 'Date', _value: date.toISOString()};
    },
    deserialize(object) {
      return new Date(object._value);
    }
  }
};

function getPrimitiveType(type) {
  return _primitiveTypes[type];
}

function getPrimitiveTypeFromValue(value) {
  if (value instanceof Date) {
    return _primitiveTypes.Date;
  }
}
