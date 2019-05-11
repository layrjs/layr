import {inspect} from 'util';
import {invokeQuery} from '@deepr/runtime';
import debugModule from 'debug';

import {isRegisterable} from './registerable';
import {isSerializable} from './serializable';

const debug = debugModule('storable');
// To display the debug log, set this environment:
// DEBUG=storable DEBUG_DEPTH=10

export class Layer {
  constructor(
    name,
    {register: registerables, parentLayer, allowQuerySources: allowedQuerySources = ['*']} = {}
  ) {
    this._registeredNames = [];
    this._registerables = {};

    this.setName(name);
    this.setParentLayer(parentLayer);
    this.allowQuerySources(allowedQuerySources);
    this.register(registerables);
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
      throw new Error(
        `Item not found in the layer (layer name: '${this.getName()}', item name: '${name}')`
      );
    }
  }

  register(registerables) {
    if (registerables !== undefined) {
      for (const [name, registerable] of Object.entries(registerables)) {
        this._register(name, registerable);
      }
    }
  }

  _register(name, registerable) {
    if (!isRegisterable(registerable)) {
      throw new Error(`Expected a registerable`);
    }

    if (registerable.getLayer({throwIfNotFound: false})) {
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

  fork({register: registerables} = {}) {
    const forkedLayer = Object.create(this);
    forkedLayer._registeredNames = [...this._registeredNames];
    forkedLayer._registerables = Object.create(this._registerables);
    forkedLayer.register(registerables);
    return forkedLayer;
  }

  // === Serialization ===

  serialize(value, options) {
    if (value === null) {
      throw new Error(`The 'null' value is not allowed`);
    }

    if (Array.isArray(value)) {
      return this._serializeArray(value, options);
    }

    if (typeof value === 'object') {
      return this._serializeObject(value, options);
    }

    return value;
  }

  _serializeArray(array, options) {
    return array.map(item => this.serialize(item, options));
  }

  _serializeObject(object, options) {
    if (isSerializable(object)) {
      return object.serialize(object, options);
    }

    const primitiveType = getPrimitiveTypeFromValue(object);
    if (primitiveType) {
      return primitiveType.serialize(object);
    }

    if (typeof object.toJSON === 'function') {
      return object.toJSON();
    }

    return this._serializePlainObject(object, options);
  }

  _serializePlainObject(object, options) {
    const serializedObject = {};
    for (const [key, value] of Object.entries(object)) {
      serializedObject[key] = this.serialize(value, options);
    }
    return serializedObject;
  }

  deserialize(value, options) {
    if (value === null) {
      throw new Error(`The 'null' value is not allowed`);
    }

    if (Array.isArray(value)) {
      return this._deserializeArray(value, options);
    }

    if (typeof value === 'object') {
      return this._deserializeObject(value, options);
    }

    return value;
  }

  _deserializeArray(array, options) {
    return array.map(item => this.deserialize(item, options));
  }

  _deserializeObject(object, options) {
    if (this._isTypedObject(object)) {
      return this._deserializeTypedObject(object, options);
    }

    return this._deserializePlainObject(object, options);
  }

  _isTypedObject(object) {
    return object._type !== undefined;
  }

  _deserializeTypedObject(object, options) {
    const type = object._type;

    const primitiveType = getPrimitiveType(type);
    if (primitiveType) {
      return primitiveType.deserialize(object);
    }

    const Class = this.get(type);
    return Class.deserialize(object, options);
  }

  _deserializePlainObject(object, options) {
    const deserializedObject = {};
    for (const [key, value] of Object.entries(object)) {
      deserializedObject[key] = this.deserialize(value, options);
    }
    return deserializedObject;
  }

  // === Parent layer ===

  getParentLayer({throwIfNotFound = true} = {}) {
    if (this._parentLayer) {
      return this._parentLayer;
    }
    if (throwIfNotFound) {
      throw new Error(`Parent layer not found`);
    }
  }

  setParentLayer(parentLayer) {
    this._parentLayer = parentLayer;
  }

  async sendQuery(query) {
    const parentLayer = this.getParentLayer();
    const source = this.getName();
    const target = parentLayer.getName();

    let result;
    query = this.serialize(query, {target});
    debug(`[%s → %s] %o`, source, target, query);
    result = await parentLayer.receiveQuery(query, {source});
    debug(`[%s ← %s] %o`, source, target, result);
    result = this.deserialize(result, {source: target});
    return result;
  }

  async receiveQuery(query, {source} = {}) {
    const target = this.getName();

    const allowed = this.checkQuerySource(source);
    if (!allowed) {
      throw new Error(`Query source not allowed (source: '${source}', target: '${target}')`);
    }

    let result;
    debug(`[%s → %s] %o)`, source, target, query);
    query = this.deserialize(query, {source});
    result = await this.invokeQuery(query);
    result = this.serialize(result, {target: source});
    debug(`[%s ← %s] %o`, source, target, result);
    return result;
  }

  async invokeQuery(query) {
    return await invokeQuery(this, query);
  }

  allowQuerySources(allowedQuerySources) {
    this._allowedQuerySources = allowedQuerySources;
  }

  checkQuerySource(querySource) {
    for (const allowedQuerySource of this._allowedQuerySources) {
      if (allowedQuerySource === '*' || querySource === allowedQuerySource) {
        return true;
      }
    }
    return false;
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
