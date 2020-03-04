import {Model, getComponentName} from '@liaison/model';
import cuid from 'cuid';
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
import {isEntity, isEntityClass} from './utilities';

export const Entity = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isEntityClass(Base)) {
    return Base;
  }

  class Entity extends Model(Base) {
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
        throw new Error(`The property '${name}' exists, but it is not an identifier attribute`);
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
          `The ${this.constructor.getComponentType().toLowerCase()} '${getComponentName(
            this
          )}' doesn't have a primary identifier attribute`
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
          `The property '${name}' exists, but it is not a secondary identifier attribute`
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

    // === Introspection ===

    static getComponentType() {
      return 'Entity';
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
