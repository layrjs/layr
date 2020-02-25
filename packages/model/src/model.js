import {Component, getComponentName, _decorateAttribute} from '@liaison/component';
import {Observable} from '@liaison/observable';
import ow from 'ow';

import {Field, isField} from './field';
import {joinFieldPath} from './utilities';

export const Model = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isModelClass(Base)) {
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

    getFieldsWithValue(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(field) {
        if (!field.hasValue()) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, field);
        }

        return true;
      };

      return this.getFields({filter, autoFork});
    },

    // === Validation ===

    validate() {
      const failedValidators = this.runValidators();

      if (failedValidators.length === 0) {
        return;
      }

      const details = failedValidators
        .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
        .join(', ');

      const error = Object.assign(
        new Error(
          `The following error(s) occurred while validating the model '${getComponentName(
            this
          )}': ${details}`
        ),
        {failedValidators}
      );

      throw error;
    },

    isValid() {
      const failedValidators = this.runValidators();

      return failedValidators.length === 0;
    },

    runValidators() {
      const failedValidators = [];

      for (const field of this.getFieldsWithValue()) {
        const name = field.getName();
        const fieldFailedValidators = field.runValidators();

        for (const {validator, path} of fieldFailedValidators) {
          failedValidators.push({validator, path: joinFieldPath([name, path])});
        }
      }

      return failedValidators;
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

export function isModelClass(object) {
  return typeof object?.isModel === 'function';
}

export function isModel(object) {
  return isModelClass(object?.constructor) === true;
}

export function field(valueType, options = {}) {
  ow(valueType, 'valueType', ow.string.nonEmpty);
  ow(options, 'options', ow.object);

  options = {...options, valueType};

  return function(target, name, descriptor) {
    ow(target, 'target', ow.object);
    ow(name, 'name', ow.string.nonEmpty);
    ow(descriptor, 'descriptor', ow.object);

    if (!(isModelClass(target) || isModel(target))) {
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
