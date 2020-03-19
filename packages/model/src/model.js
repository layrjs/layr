import {ComponentMixin, AttributeSelector} from '@liaison/component';
import {Observable} from '@liaison/observable';
import ow from 'ow';

import {ModelAttribute, isModelAttribute} from './model-attribute';
import {isModelClass, isModelInstance, joinModelAttributePath} from './utilities';

export const ModelMixin = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isModelClass(Base)) {
    return Base;
  }

  class ModelMixin extends Observable(ComponentMixin(Base)) {
    static getComponentType() {
      return 'Model';
    }

    static getPropertyClass(type) {
      ow(type, 'type', ow.string.nonEmpty);

      if (type === 'modelAttribute') {
        return ModelAttribute;
      }

      return super.getPropertyClass(type);
    }

    static isModel(object) {
      return isModelInstance(object);
    }
  }

  const classAndInstanceMethods = {
    // === Model attributes ===

    getModelAttribute(name, options = {}) {
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

      if (!isModelAttribute(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a model attribute (${property.describe()})`
        );
      }

      return property;
    },

    setModelAttribute(name, propertyOptions = {}, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(options, 'options', ow.object);

      return this.setProperty(name, ModelAttribute, propertyOptions, options);
    },

    hasModelAttribute(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getModelAttribute(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getModelAttributes(options = {}) {
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
        if (!isModelAttribute(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, setAttributesOnly, autoFork});
    },

    // === Validation ===

    validate(attributeSelector = true) {
      const failedValidators = this.runValidators(attributeSelector);

      if (failedValidators.length === 0) {
        return;
      }

      const details = failedValidators
        .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
        .join(', ');

      const error = Object.assign(
        new Error(
          `The following error(s) occurred while validating the ${this.getComponentType()} '${this.getComponentName()}': ${details}`
        ),
        {failedValidators}
      );

      throw error;
    },

    isValid(attributeSelector = true) {
      const failedValidators = this.runValidators(attributeSelector);

      return failedValidators.length === 0;
    },

    runValidators(attributeSelector = true) {
      attributeSelector = AttributeSelector.normalize(attributeSelector);

      const failedValidators = [];

      if (attributeSelector === false) {
        return failedValidators; // Optimization
      }

      for (const modelAttribute of this.getModelAttributes({setAttributesOnly: true})) {
        const name = modelAttribute.getName();

        const subattributeSelector = AttributeSelector.get(attributeSelector, name);

        if (subattributeSelector === false) {
          continue;
        }

        const modelAttributeFailedValidators = modelAttribute.runValidators(subattributeSelector);

        for (const {validator, path} of modelAttributeFailedValidators) {
          failedValidators.push({validator, path: joinModelAttributePath([name, path])});
        }
      }

      return failedValidators;
    }
  };

  Object.assign(ModelMixin, classAndInstanceMethods);
  Object.assign(ModelMixin.prototype, classAndInstanceMethods);

  return ModelMixin;
};

export class Model extends ModelMixin() {
  static __ComponentMixin = ModelMixin;
}
