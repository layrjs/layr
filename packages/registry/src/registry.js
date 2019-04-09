import {inspect} from 'util';

export class Registry {
  constructor(items) {
    this._keys = [];
    this._items = {};
    this.register(items);
  }

  register(items) {
    if (items !== undefined) {
      for (const [key, value] of Object.entries(items)) {
        this._register(key, value);
      }
    }
  }

  _register(key, value) {
    if (this._keys.includes(key)) {
      throw new Error(`Key already registered (key: '${key}')`);
    }

    if (value.$registry !== undefined) {
      throw new Error(`Item already registered (key: '${key}')`);
    }

    this._keys.push(key);
    this.__register(key, value);

    Object.defineProperty(this, key, {
      get() {
        let value = this._items[key];
        if (!Object.prototype.hasOwnProperty.call(this._items, key)) {
          value = this.__register(key, value);
        }
        return value;
      }
    });
  }

  __register(key, value) {
    const forkedValue = forkValue(value);
    Object.defineProperty(forkedValue, '$registry', {value: this});
    this._items[key] = forkedValue;
    return forkedValue;
  }

  fork(items) {
    const forkedRegistry = Object.create(this);
    forkedRegistry._keys = [...this._keys];
    forkedRegistry._items = Object.create(this._items);
    forkedRegistry.register(items);
    return forkedRegistry;
  }

  [inspect.custom]() {
    const items = {};
    for (const key of this._keys) {
      items[key] = this._items[key];
    }
    return items;
  }
}

function forkValue(value) {
  if (typeof value === 'function') {
    return class extends value {
      static [Symbol.hasInstance](instance) {
        return instance instanceof value;
      }
    };
  }
  return Object.create(value);
}
