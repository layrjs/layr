import {inspect} from 'util';

export class Registry {
  constructor(items) {
    this._keys = [];
    this._items = {};
    this._registerItems(items);
  }

  register(key, value) {
    if (this._keys.includes(key)) {
      throw new Error(`Key already registered (key: '${key}')`);
    }

    if (value.$registry !== undefined) {
      throw new Error(`Item already registered (key: '${key}')`);
    }

    this._keys.push(key);
    this._register(key, value);

    Object.defineProperty(this, key, {
      get() {
        let value = this._items[key];
        if (!Object.prototype.hasOwnProperty.call(this._items, key)) {
          value = this._register(key, value);
        }
        return value;
      }
    });
  }

  _register(key, value) {
    const forkedValue = forkValue(value);
    Object.defineProperty(forkedValue, '$registry', {value: this});
    this._items[key] = forkedValue;
    return forkedValue;
  }

  fork(items) {
    const forkedRegistry = Object.create(this);
    forkedRegistry._keys = [...this._keys];
    forkedRegistry._items = Object.create(this._items);
    forkedRegistry._registerItems(items);
    return forkedRegistry;
  }

  _registerItems(items) {
    if (items !== undefined) {
      for (const [key, value] of Object.entries(items)) {
        this.register(key, value);
      }
    }
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
