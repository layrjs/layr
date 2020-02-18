import {Component, _decorateAttribute} from '@liaison/component';
import {Observable} from '@liaison/observable';
import ow from 'ow';

import {Field, isField} from './field';

export const Model = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isModel(Base)) {
    return Base;
  }

  class BaseModel extends Observable(Component(Base)) {}

  const methods = {
    // === Fields ===

    getField(name, options = {}) {
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

      if (!isField(property)) {
        throw new Error(`The property '${name}' exists, but it is not a field`);
      }

      return property;
    },

    setField(name, propertyOptions = {}, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(options, 'options', ow.object);

      return this.setProperty(name, Field, propertyOptions, options);
    },

    hasField(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getField(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getFields(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(property) {
        if (!isField(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, autoFork});
    },

    getActiveFields(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(field) {
        if (!field.isActive()) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, field);
        }

        return true;
      };

      return this.getFields({filter, autoFork});
    }
  };

  Object.assign(BaseModel, methods);
  Object.assign(BaseModel.prototype, methods);

  class Model extends BaseModel {
    static isModel(object) {
      return isModel(object);
    }
  }

  return Model;
};

export function isModel(object) {
  return typeof object?.constructor?.isModel === 'function';
}

export function field(valueType, options = {}) {
  ow(valueType, 'valueType', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  options = {...options, valueType};

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isModel(target) || isModel(target.prototype))) {
      throw new Error(`@field() target doesn't inherit from Model (property name: '${name}')`);
    }

    if (
      !(
        (typeof descriptor.initializer === 'function' || descriptor.initializer === null) &&
        descriptor.enumerable === true
      )
    ) {
      throw new Error(
        `@field() cannot be used without a field declaration (property name: '${name}')`
      );
    }

    return _decorateAttribute({target, name, descriptor, AttributeClass: Field, options});
  };
}
