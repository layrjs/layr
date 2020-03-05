import ow from 'ow';

import {WithProperties} from './with-properties';
import {serialize} from './serialization';
import {deserialize} from './deserialization';
import {AttributeSelector} from './attribute-selector';
import {
  isComponentClass,
  isComponent,
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  getTypeOf
} from './utilities';

export const Component = (Base = Object) => {
  ow(Base, ow.function);

  if (isComponentClass(Base)) {
    return Base;
  }

  class Component extends WithProperties(Base) {
    // === Creation ===

    constructor(object = {}, options) {
      ow(object, 'object', ow.object);

      super(object, options);

      this.markAsNew();
    }

    // === Instantiation ===

    static __instantiate(object = {}, options = {}) {
      // TODO: Make this method more meaningful
      // We should probably integrate the deserialization into the class

      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object.exactShape({isNew: ow.optional.boolean}));

      const {isNew = false} = options;

      if (isNew === true) {
        let attributeSelector = this.prototype.expandAttributeSelector(true, {depth: 0});
        const deserializedAttributeSelector = AttributeSelector.fromNames(Object.keys(object));
        attributeSelector = AttributeSelector.remove(
          attributeSelector,
          deserializedAttributeSelector
        );

        return new this({}, {attributeSelector});
      }

      return Object.create(this.prototype);
    }

    // === Naming ===

    static getName(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const name = this.__name ?? this.name;

      if (typeof name === 'string' && name !== '') {
        return name;
      }

      if (throwIfMissing) {
        throw new Error("Component's name is missing");
      }
    }

    static setName(name) {
      ow(name, 'name', ow.string);

      validateComponentName(name, {allowInstances: false});

      Object.defineProperty(this, '__name', {value: name, configurable: true});
    }

    // === Related components ===

    // TODO: Handle forking

    static getRelatedComponent(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const nameIsComponentClassName = validateComponentName(name) === 'componentClassName';

      const className = nameIsComponentClassName
        ? name
        : getComponentClassNameFromComponentInstanceName(name);

      const relatedComponents = this.__getRelatedComponents();
      const Component = relatedComponents[className];

      if (Component === undefined) {
        if (throwIfMissing) {
          throw new Error(`Cannot get the related component class '${className}'`);
        }
        return undefined;
      }

      return nameIsComponentClassName ? Component : Component.prototype;
    }

    static registerRelatedComponent(Component) {
      if (!isComponentClass(Component)) {
        throw new Error(
          `Expected a component class, but received a value of type '${getTypeOf(Component, {
            humanize: true
          })}'`
        );
      }

      const relatedComponents = this.__getRelatedComponents();

      relatedComponents[Component.getName()] = Component;
    }

    static __getRelatedComponents() {
      if (this.__relatedComponents === undefined) {
        Object.defineProperty(this, '__relatedComponents', {
          value: Object.create(null),
          configurable: true
        });
      }

      return this.__relatedComponents;
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

    fork(Component) {
      // TODO: Altering the constructor sounds wrong
      ow(Component, 'Component', ow.optional.function);

      const forkedComponent = Object.create(this);

      if (Component !== undefined) {
        Object.defineProperty(forkedComponent, 'constructor', {
          value: Component,
          writable: true,
          enumerable: false,
          configurable: true
        });
      }

      return forkedComponent;
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

    static getComponentType() {
      return 'Component';
    }

    static introspect() {
      const introspectedProperties = this.introspectProperties();
      const introspectedPrototypeProperties = this.prototype.introspectProperties();

      if (introspectedProperties.length === 0 && introspectedPrototypeProperties.length === 0) {
        return undefined;
      }

      const introspectedComponent = {name: this.getName(), type: this.getComponentType()};

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
  }

  return Component;
};
