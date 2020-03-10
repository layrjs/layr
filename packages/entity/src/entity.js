import {Model} from '@liaison/model';
import cuid from 'cuid';
import {hasOwnProperty} from 'core-helpers';
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
import {isEntity, isEntityClass} from './utilities';

export const Entity = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isEntityClass(Base)) {
    return Base;
  }

  class Entity extends Model(Base) {
    static getComponentType() {
      return 'Entity';
    }

    getComponentType() {
      return 'entity';
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

    static __instantiate(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object.exactShape({isNew: ow.optional.boolean}));

      const {isNew = false} = options;

      const entityManager = this.__getEntityManager();
      const entity = entityManager.getEntity(object);

      if (entity !== undefined) {
        if (isNew && !entity.isNew()) {
          throw new Error(
            `Cannot mark as new an existing non-new entity (${entity.describeComponent()})`
          );
        }

        if (!isNew && entity.isNew()) {
          entity.markAsNotNew();
        }

        return entity;
      }

      return super.__instantiate(object, options);
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

    // === Entity manager ===

    static __getEntityManager() {
      if (this.__entityManager === undefined) {
        Object.defineProperty(this, '__entityManager', {value: new EntityManager(this)});
      } else if (!hasOwnProperty(this, '__entityManager')) {
        Object.defineProperty(this, '__entityManager', {value: this.__entityManager.fork(this)});
      }

      return this.__entityManager;
    }

    // === Utilities ===

    static generateId() {
      return cuid();
    }

    static isEntity(object) {
      return isEntity(object);
    }
  }

  return Entity;
};
