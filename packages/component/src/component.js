import ow from 'ow';

import {WithProperties} from './with-properties';
import {serialize} from './serialization';
import {deserialize} from './deserialization';
import {isComponent, validateComponentName} from './utilities';

export const Component = (Base = Object) => {
  ow(Base, ow.function);

  if (isComponent(Base.prototype)) {
    return Base;
  }

  return class Component extends WithProperties(Base) {
    // === Creation ===

    constructor(object = {}) {
      super(object);
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
      ow(name, 'name', ow.string);

      validateComponentName(name);

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

    // === Forking ===

    static fork() {
      return class extends this {};
    }

    fork() {
      return Object.create(this);
    }

    // === Serialization ===

    static toJSON() {
      return serialize(this, {knownComponents: [this]});
    }

    toJSON() {
      return serialize(this, {knownComponents: [this.constructor]});
    }

    // === Deserialization ===

    static fromJSON(value) {
      return deserialize(value, {knownComponents: [this]});
    }

    // === Introspection ===

    static introspect() {
      const introspectedProperties = this.introspectProperties();
      const introspectedPrototypeProperties = this.prototype.introspectProperties();

      if (introspectedProperties.length === 0 && introspectedPrototypeProperties.length === 0) {
        return undefined;
      }

      const introspectedComponent = {name: this.getName()};

      if (introspectedProperties.length > 0) {
        introspectedComponent.properties = introspectedProperties;
      }

      if (introspectedPrototypeProperties.length > 0) {
        introspectedComponent.prototype = {properties: introspectedPrototypeProperties};
      }

      return introspectedComponent;
    }

    // === Utilities ===

    static isComponent(object) {
      return isComponent(object);
    }
  };
};
