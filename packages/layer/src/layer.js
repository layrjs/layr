import {inspect} from 'util';
import nanoid from 'nanoid';
import {hasOwnProperty} from '@liaison/util';
import {invokeQuery} from '@deepr/runtime';
import {syncOrAsync} from '@deepr/util';
import ow from 'ow';
import debugModule from 'debug';

import {isRegisterable, isExposed} from './registerable';
import {isSerializable} from './serializable';

const debugSending = debugModule('liaison:layer:sending');
const debugReceiving = debugModule('liaison:layer:receiving');

// To display the debug log, set this environment:
// DEBUG=liaison:layer:* DEBUG_DEPTH=10

export class Layer {
  constructor(registerables, {name, parent} = {}) {
    this._registerables = Object.create(null);

    if (registerables !== undefined) {
      this.register(registerables);
    }

    this.setName(name);

    if (parent !== undefined) {
      this.setParent(parent);
    }
  }

  getName() {
    return this._name;
  }

  setName(name) {
    ow(name, ow.optional.string.nonEmpty);

    if (name !== undefined) {
      this._name = name;
      this._nameHasBeenGenerated = false;
      return;
    }

    this._name = nanoid(10);
    this._nameHasBeenGenerated = true;
  }

  nameHasBeenGenerated() {
    return this._nameHasBeenGenerated;
  }

  // === Registration ===

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

    if (registerable.$getLayer({fallBackToClass: false, throwIfNotFound: false})) {
      throw new Error(`Registerable already registered (name: '${name}')`);
    }

    if (name in this._registerables) {
      throw new Error(`Name already registered (name: '${name}')`);
    }

    if (this.isOpen()) {
      throw new Error(`Cannot register an item in an open layer (name: '${name}')`);
    }

    registerable.$setLayer(this);
    registerable.$setRegisteredName(name);
    this._registerables[name] = registerable;

    Object.defineProperty(this, name, {
      get() {
        return this.get(name);
      }
    });
  }

  // === Opening and closing ===

  async open() {
    if (this._isOpen) {
      throw new Error(`Cannot open a layer that is already open`);
    }

    if (this._isOpen === false && !hasOwnProperty(this, '_isOpen')) {
      throw new Error(`Cannot reopen a layer from a fork`);
    }

    if (this.hasParent() && !this.getParent().isOpen()) {
      throw new Error(`The parent layer must be opened before the child one`);
    }

    this._isOpen = true;

    try {
      for (const item of this.getItems()) {
        await item.$open();
      }
    } catch (error) {
      this._isOpen = false;
      throw error;
    }
  }

  async close() {
    if (!this._isOpen) {
      throw new Error(`Cannot close a layer that is not open`);
    }

    if (!hasOwnProperty(this, '_isOpen')) {
      throw new Error(`Cannot close a layer from a fork`);
    }

    for (const item of this.getItems()) {
      await item.$close();
    }

    this._isOpen = false;
  }

  isOpen() {
    return this._isOpen === true;
  }

  // === Getting items ===

  get(name, {throwIfNotFound = true} = {}) {
    if (!this.isOpen()) {
      throw new Error(`Cannot get an item from a closed layer (name: '${name}')`);
    }

    let registerable = this._registerables[name];

    if (registerable === undefined) {
      if (throwIfNotFound) {
        throw new Error(`Item not found in the layer (name: '${name}')`);
      }
      return undefined;
    }

    if (!hasOwnProperty(this._registerables, name)) {
      // Since the layer has been forked, the registerable must be forked as well
      registerable = registerable.__fork();
      registerable.$setLayer(this);
      this._registerables[name] = registerable;
    }

    return registerable;
  }

  getItems({filter} = {}) {
    const layer = this;
    return {
      * [Symbol.iterator]() {
        // eslint-disable-next-line guard-for-in
        for (const name in layer._registerables) {
          const item = layer.get(name);
          if (filter && !filter(item)) {
            continue;
          }
          yield item;
        }
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

  // === Forking ===

  fork() {
    const forkedLayer = Object.create(this);
    forkedLayer._registerables = Object.create(this._registerables);
    return forkedLayer;
  }

  // === Introspection ===

  introspect() {
    const introspection = {
      name: !this.nameHasBeenGenerated() ? this.getName() : undefined,
      items: {}
    };

    for (const exposedItem of this.getExposedItems()) {
      introspection.items[exposedItem.$getRegisteredName()] = exposedItem.$introspect();
    }

    return introspection;
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
      return object.$serialize(options);
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

    const registerable = this.get(type);
    return registerable.$deserialize(object, options);
  }

  _deserializePlainObject(object, options) {
    const deserializedObject = {};
    for (const [key, value] of Object.entries(object)) {
      deserializedObject[key] = this.deserialize(value, options);
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
    const source = this.getName();
    const target = parent.getName();

    query = this.serialize(query, {target});
    const items = this._serializeItems({isSending: true});
    debugSending(`[%s → %s] {query: %o, items: %o}`, source, target, query, items);
    return syncOrAsync(parent.receiveQuery({query, items, source}), ({result, items}) => {
      debugSending(`[%s ← %s] {result: %o, items: %o}`, source, target, result, items);
      result = this.deserialize(result, {source: target});
      this._deserializeItems(items, {source: target});
      return result;
    });
  }

  receiveQuery({query, items, source} = {}) {
    const target = this.getName();

    debugReceiving(`[%s → %s] {query: %o, items: %o})`, source, target, query, items);
    this._deserializeItems(items, {source, isReceiving: true});
    query = this.deserialize(query, {source});
    return syncOrAsync(this.invokeQuery(query), result => {
      result = this.serialize(result, {target: source});
      items = this._serializeItems({target: source});
      debugReceiving(`[%s ← %s] {query: %o, items: %o}`, source, target, result, items);
      return {result, items};
    });
  }

  invokeQuery(query) {
    return invokeQuery(this, query);
  }

  _serializeItems({target, isSending} = {}) {
    const serializedItems = {};
    let hasSerializedItems = false;

    for (const item of this.getItems()) {
      if (typeof item !== 'object') {
        continue;
      }

      const name = item.$getRegisteredName();

      if (isSending) {
        if (!this.getParent().get(name, {throwIfNotFound: false})) {
          continue;
        }
      } else if (!isExposed(item)) {
        continue;
      }

      if (!isSerializable(item)) {
        throw new Error(`Cannot send an item that is not serializable (name: '${name}')`);
      }

      serializedItems[name] = item.$serialize({target});
      hasSerializedItems = true;
    }

    return hasSerializedItems ? serializedItems : undefined;
  }

  _deserializeItems(serializedItems, {source, isReceiving} = {}) {
    if (serializedItems === undefined) {
      return;
    }

    for (const [name, serializedItem] of Object.entries(serializedItems)) {
      const item = this.get(name);

      if (isReceiving && !isExposed(item)) {
        throw new Error(`Cannot receive an item that is not exposed (name: '${name}')`);
      }

      if (!isSerializable(item)) {
        throw new Error(`Cannot receive an item that is not serializable (name: '${name}')`);
      }

      item.$deserialize(serializedItem, {source});
    }
  }

  // === Utilities ===

  [inspect.custom]() {
    const items = {};
    for (const item of this.getItems()) {
      items[item.$getRegisteredName()] = item;
    }
    return items;
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
