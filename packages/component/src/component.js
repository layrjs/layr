import ow from 'ow';

import {serialize} from './serialization';
import {deserialize} from './deserialization';
import {isComponent} from './utilities';

export const Component = (Base = Object) =>
  class Component extends Base {
    // === Creation ===

    constructor() {
      super();
      this.markAsNew();
    }

    // === Instantiation ===

    static instantiate() {
      return Object.create(this.prototype);
    }

    // === Naming ===

    static getName(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      let name = this.__name ?? this.name;

      if (name === 'Component') {
        name = undefined;
      }

      if (typeof name === 'string' && name !== '') {
        return name;
      }

      if (throwIfMissing) {
        throw new Error("Component's name is missing");
      }
    }

    static setName(name) {
      ow(name, 'name', ow.string.nonEmpty);

      if (name === 'Component') {
        throw new Error("A component cannot be named 'Component");
      }

      Object.defineProperty(this, '__name', {value: name, configurable: true});
    }

    // === isNew mark ===

    isNew() {
      return this.__isNew === true;
    }

    markAsNew() {
      Object.defineProperty(this, '__isNew', {value: true, configurable: true});
    }

    markAsNotNew() {
      Object.defineProperty(this, '__isNew', {value: false, configurable: true});
    }

    // === Serialization ===

    static toJSON() {
      return serialize(this);
    }

    toJSON() {
      return serialize(this);
    }

    // === Deserialization ===

    static fromJSON(value) {
      return deserialize(value, {knownComponents: [this]});
    }

    // === Forking ===

    static fork() {}

    fork() {}

    // === Utilities ===

    static isComponent(object) {
      return isComponent(object);
    }
  };
