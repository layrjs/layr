import {inspect} from 'util';
import nanoid from 'nanoid';
import {invokeQuery} from '@deepr/runtime';
import {syncOrAsync} from '@deepr/util';
import debugModule from 'debug';

import {isRegisterable, isExposed} from './registerable';
import {isSerializable} from './serializable';

const debug = debugModule('liaison:layer');
// To display the debug log, set this environment:
// DEBUG=liaison DEBUG_DEPTH=10

export class Layer {
  constructor(registerables, {name, environment, parent} = {}) {
    this._registeredNames = [];
    this._registerables = {};
    this._environment = {};

    if (registerables !== undefined) {
      this.register(registerables);
    }

    if (name !== undefined) {
      this.setName(name);
    }

    if (environment !== undefined) {
      this.setEnvironment(environment);
    }

    if (parent !== undefined) {
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
    if (registerables === null) {
      throw new Error(`Expected an object (received: null)`);
    }

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

    registerable.setLayer(this);
    registerable.setRegisteredName(name);
    this._registerables[name] = registerable;
    this._registeredNames.push(name);

    Object.defineProperty(this, name, {
      get() {
        let registerable = this._registerables[name];
        if (!Object.prototype.hasOwnProperty.call(this._registerables, name)) {
          registerable = registerable.fork();
          registerable.setLayer(this);
          this._registerables[name] = registerable;
        }
        return registerable;
      }
    });
  }

  // === Environment ===

  getEnvironment() {
    return this._environment;
  }

  setEnvironment(environment) {
    if (environment === null) {
      throw new Error(`Expected an object (received: null)`);
    }

    if (typeof environment !== 'object') {
      throw new Error(`Expected an object (received: ${typeof environment})`);
    }

    this._environment = environment;
  }

  // === Forking ===

  fork(registerables) {
    const forkedLayer = Object.create(this);

    forkedLayer._registeredNames = [...this._registeredNames];
    forkedLayer._registerables = Object.create(this._registerables);
    forkedLayer._environment = {...this._environment};

    if (registerables) {
      forkedLayer.register(registerables);
    }

    return forkedLayer;
  }

  // === Introspection ===

  getItems({filter} = {}) {
    return {
      [Symbol.iterator]: () => {
        const iterator = this._registeredNames[Symbol.iterator]();
        return {
          next: () => {
            while (true) {
              let item;
              const {value: name, done} = iterator.next();
              if (name !== undefined) {
                item = this[name];
                if (filter && !filter(item)) {
                  continue;
                }
              }
              return {value: item, done};
            }
          }
        };
      }
    };
  }

  getExposedItems({filter: otherFilter} = {}) {
    const filter = function (item) {
      if (!isExposed(item)) {
        return false;
      }
      if (otherFilter) {
        return otherFilter(item);
      }
      return true;
    };
    return this.getItems({filter});
  }

  introspect() {
    const introspection = {
      id: this.getId(),
      name: this.getName(),
      items: {}
    };

    for (const exposedItem of this.getExposedItems()) {
      introspection.items[exposedItem.getRegisteredName()] = exposedItem.introspect();
    }

    return introspection;
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
    const environment = this.getEnvironment();

    const parent = this.getParent();
    const source = this.getId();
    const target = parent.getId();

    query = this.serialize(query, {target});
    debug(`[%s → %s] %o`, source, target, query);
    return syncOrAsync(parent.receiveQuery(query, {environment, source}), result => {
      debug(`[%s ← %s] %o`, source, target, result);
      result = this.deserialize(result, {source: target});
      return result;
    });
  }

  receiveQuery(query, {environment, source} = {}) {
    this.setEnvironment(environment);

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
