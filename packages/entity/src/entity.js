import {ModelMixin, AttributeSelector, getTypeOf} from '@liaison/model';
import cuid from 'cuid';
import {hasOwnProperty} from 'core-helpers';
import isPlainObject from 'lodash/isPlainObject';
import ow from 'ow';

import {isIdentifierAttribute} from './identifier-attribute';
import {
  PrimaryIdentifierAttribute,
  isPrimaryIdentifierAttribute
} from './primary-identifier-attribute';
import {
  SecondaryIdentifierAttribute,
  isSecondaryIdentifierAttribute
} from './secondary-identifier-attribute';
import {EntityManager} from './entity-manager';
import {isEntityClass, isEntityInstance} from './utilities';

export const EntityMixin = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isEntityClass(Base)) {
    return Base;
  }

  class EntityMixin extends ModelMixin(Base) {
    static getComponentType() {
      return 'Entity';
    }

    static getPropertyClass(type) {
      ow(type, 'type', ow.string.nonEmpty);

      if (type === 'primaryIdentifierAttribute') {
        return PrimaryIdentifierAttribute;
      }

      if (type === 'secondaryIdentifierAttribute') {
        return SecondaryIdentifierAttribute;
      }

      return super.getPropertyClass(type);
    }

    // === Creation ===

    static instantiate(identifiers = {}, options = {}) {
      ow(identifiers, 'object', ow.object);
      ow(
        options,
        'options',
        ow.object.exactShape({
          isNew: ow.optional.boolean,
          attributeSelector: ow,
          attributeFilter: ow.optional.function
        })
      );

      const entityManager = this.__getEntityManager();
      const entity = entityManager.getEntity(identifiers);

      if (entity !== undefined) {
        const {isNew, attributeSelector = {}, attributeFilter} = options;

        if (isNew !== undefined) {
          if (isNew && !entity.isNew()) {
            throw new Error(
              `Cannot mark as new an existing non-new entity (${entity.describeComponent()})`
            );
          }

          if (!isNew && entity.isNew()) {
            entity.markAsNotNew();
          }
        }

        return entity.__finishInstantiation(identifiers, {
          isNew: Boolean(isNew),
          attributeSelector,
          attributeFilter
        });
      }

      return super.instantiate(identifiers, options);
    }

    // === Entity manager ===

    static __getEntityManager() {
      if (this.__entityManager === undefined) {
        Object.defineProperty(this, '__entityManager', {value: new EntityManager(this)});
      } else if (!hasOwnProperty(this, '__entityManager')) {
        Object.defineProperty(this, '__entityManager', {value: this.__entityManager.fork(this)});
      }

      return this.__entityManager;
    }

    // === Identifier attributes ===

    getIdentifierAttribute(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      const property = this.getProperty(name, {throwIfMissing, autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isIdentifierAttribute(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not an identifier attribute (${property.describe()})`
        );
      }

      return property;
    }

    getPrimaryIdentifierAttribute(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      for (const identifierAttribute of this.getIdentifierAttributes({autoFork})) {
        if (isPrimaryIdentifierAttribute(identifierAttribute)) {
          return identifierAttribute;
        }
      }

      if (throwIfMissing) {
        throw new Error(
          `The ${this.getComponentType()} '${this.getComponentName()}' doesn't have a primary identifier attribute`
        );
      }
    }

    getSecondaryIdentifierAttribute(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      const property = this.getIdentifierAttribute(name, {throwIfMissing, autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isSecondaryIdentifierAttribute(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a secondary identifier attribute (${property.describe()})`
        );
      }

      return property;
    }

    setPrimaryIdentifierAttribute(name, propertyOptions = {}, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(options, 'options', ow.object);

      return this.setProperty(name, PrimaryIdentifierAttribute, propertyOptions, options);
    }

    setSecondaryIdentifierAttribute(name, propertyOptions = {}, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(options, 'options', ow.object);

      return this.setProperty(name, SecondaryIdentifierAttribute, propertyOptions, options);
    }

    hasIdentifierAttribute(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return (
        this.getIdentifierAttribute(name, {throwIfMissing: false, autoFork: false}) !== undefined
      );
    }

    hasPrimaryIdentifierAttribute() {
      return (
        this.getPrimaryIdentifierAttribute({throwIfMissing: false, autoFork: false}) !== undefined
      );
    }

    hasSecondaryIdentifierAttribute(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return (
        this.getSecondaryIdentifierAttribute(name, {throwIfMissing: false, autoFork: false}) !==
        undefined
      );
    }

    getIdentifierAttributes(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          filter: ow.optional.function,
          setAttributesOnly: ow.optional.boolean,
          autoFork: ow.optional.boolean
        })
      );

      const {filter: originalFilter, setAttributesOnly = false, autoFork = true} = options;

      const filter = function(property) {
        if (!isIdentifierAttribute(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, setAttributesOnly, autoFork});
    }

    getSecondaryIdentifierAttributes(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          filter: ow.optional.function,
          setAttributesOnly: ow.optional.boolean,
          autoFork: ow.optional.boolean
        })
      );

      const {filter: originalFilter, setAttributesOnly = false, autoFork = true} = options;

      const filter = function(property) {
        if (!isSecondaryIdentifierAttribute(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, setAttributesOnly, autoFork});
    }

    // === Identifier descriptor ===

    getIdentifierDescriptor() {
      const primaryIdentifierAttribute = this.getPrimaryIdentifierAttribute();

      if (primaryIdentifierAttribute.isSet()) {
        const name = primaryIdentifierAttribute.getName();
        const value = primaryIdentifierAttribute.getValue();

        return {[name]: value};
      }

      for (const secondaryIdentifierAttribute of this.getSecondaryIdentifierAttributes({
        setAttributesOnly: true
      })) {
        const name = secondaryIdentifierAttribute.getName();
        const value = secondaryIdentifierAttribute.getValue();

        return {[name]: value};
      }

      throw new Error(
        `Cannot get an identifier descriptor from ${this.describeComponentType()} that has no set identifier (${this.describeComponent()})`
      );
    }

    static normalizeIdentifierDescriptor(identifierDescriptor) {
      if (typeof identifierDescriptor === 'string' || typeof identifierDescriptor === 'number') {
        return this.__normalizePrimaryIdentifierDescriptor(identifierDescriptor);
      }

      if (!isPlainObject(identifierDescriptor)) {
        throw new Error(
          `An identifier descriptor should be a string, a number, or an object, but received a value of type '${getTypeOf(
            identifierDescriptor
          )}' (${this.prototype.describeComponent()})`
        );
      }

      const attributes = Object.entries(identifierDescriptor);

      if (attributes.length !== 1) {
        throw new Error(
          `An identifier descriptor should be a string, a number, or an object composed of one attribute, but received an object composed of ${
            attributes.length
          } attributes (${this.prototype.describeComponent()}, received object: ${JSON.stringify(
            identifierDescriptor
          )})`
        );
      }

      const [name, value] = attributes[0];

      const identifierAttribute = this.prototype.getIdentifierAttribute(name);

      identifierAttribute.checkValue(value);

      return {[name]: value};
    }

    static __normalizePrimaryIdentifierDescriptor(primaryIdentifierDescriptor) {
      const primaryIdentifierAttribute = this.prototype.getPrimaryIdentifierAttribute();

      const name = primaryIdentifierAttribute.getName();
      const value = primaryIdentifierDescriptor;

      primaryIdentifierAttribute.checkValue(value);

      return {[name]: value};
    }

    static describeIdentifierDescriptor(identifierDescriptor) {
      identifierDescriptor = this.normalizeIdentifierDescriptor(identifierDescriptor);

      const [[name, value]] = Object.entries(identifierDescriptor);

      const valueString = typeof value === 'string' ? `'${value}'` : value.toString();

      return `${name}: ${valueString}`;
    }

    // === Attribute selectors ===

    expandAttributeSelector(attributeSelector, options = {}) {
      let expandedAttributeSelector = super.expandAttributeSelector(attributeSelector, options);

      const primaryIdentifierAttribute = this.getPrimaryIdentifierAttribute();

      // Always include the primary identifier attribute
      expandedAttributeSelector = AttributeSelector.set(
        expandedAttributeSelector,
        primaryIdentifierAttribute.getName(),
        true
      );

      return expandedAttributeSelector;
    }

    // === Detachment ===

    detach() {
      const entityManager = this.constructor.__getEntityManager();

      entityManager.removeEntity(this);

      return super.detach();
    }

    // === Serialization ===

    serialize(options = {}) {
      ow(
        options,
        'options',
        ow.object.partialShape({
          returnComponentReferences: ow.optional.boolean,
          referencedComponents: ow.optional.set,
          includeComponentNames: ow.optional.boolean
        })
      );

      const {
        returnComponentReferences = false,
        referencedComponents,
        includeComponentNames = true
      } = options;

      if (returnComponentReferences && !includeComponentNames) {
        throw new Error(
          `The 'returnComponentReferences' option cannot be 'true' when the 'includeComponentNames' option is 'false' (${this.describeComponent()})`
        );
      }

      if (returnComponentReferences) {
        if (referencedComponents !== undefined) {
          referencedComponents.add(this);
        }

        const serializedComponent = {__component: this.getComponentName()};

        const identifierDescriptor = this.getIdentifierDescriptor();

        Object.assign(serializedComponent, identifierDescriptor);

        return serializedComponent;
      }

      return super.serialize(options);
    }

    // === Utilities ===

    static generateId() {
      return cuid();
    }

    static isEntity(object) {
      return isEntityInstance(object);
    }
  }

  return EntityMixin;
};

export class Entity extends EntityMixin() {
  static __ComponentMixin = EntityMixin;
}
