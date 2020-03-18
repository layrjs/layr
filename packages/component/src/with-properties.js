import {hasOwnProperty, getClassOf} from 'core-helpers';
import ow from 'ow';

import {Property} from './property';
import {Attribute, isAttributeClass, isAttribute} from './attribute';
import {Method, isMethodClass, isMethod} from './method';
import {AttributeSelector} from './attribute-selector';
import {getTypeOf} from './utilities';

export const WithProperties = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isWithProperties(Base)) {
    return Base;
  }

  class WithProperties extends Base {
    static getPropertyClass(type) {
      ow(type, 'type', ow.string.nonEmpty);

      if (type === 'property') {
        return Property;
      }

      if (type === 'attribute') {
        return Attribute;
      }

      if (type === 'method') {
        return Method;
      }

      throw new Error(`The specified property type ('${type}') is unknown`);
    }

    constructor(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(
        options,
        'options',
        ow.object.exactShape({
          attributeSelector: ow.optional.any
        })
      );

      let {attributeSelector = true} = options;

      attributeSelector = AttributeSelector.normalize(attributeSelector);

      super();

      if (attributeSelector === false) {
        return this; // Optimization
      }

      for (const attribute of this.getAttributes()) {
        const name = attribute.getName();

        if (AttributeSelector.get(attributeSelector, name) === false) {
          continue;
        }

        const value = hasOwnProperty(object, name) ? object[name] : attribute.getDefaultValue();

        attribute.setValue(value);
      }
    }
  }

  const classAndInstanceMethods = {
    // === Properties ===

    getProperty(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({throwIfMissing: ow.optional.boolean, autoFork: ow.optional.boolean})
      );

      const {throwIfMissing = true, autoFork = true} = options;

      const properties = this.__getProperties();

      let property = properties[name];

      if (property === undefined) {
        if (throwIfMissing) {
          throw new Error(`The property '${name}' is missing (${this.describeComponent()})`);
        }
        return undefined;
      }

      if (autoFork && property.getParent() !== this) {
        property = property.fork(this);
        properties[name] = property;
      }

      return property;
    },

    setProperty(name, PropertyClass, propertyOptions = {}, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(PropertyClass, 'PropertyClass', ow.function);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(
        options,
        'options',
        ow.object.exactShape({
          methodCreator: ow.optional.function,
          returnDescriptor: ow.optional.boolean
        })
      );

      const {methodCreator, returnDescriptor = false} = options;

      let property = this.getProperty(name, {throwIfMissing: false});

      if (property === undefined) {
        property = new PropertyClass(name, this, propertyOptions);
        const properties = this.__getProperties();
        properties[name] = property;
      } else {
        if (getTypeOf(property) !== getTypeOf(PropertyClass.prototype)) {
          throw new Error(`Cannot change the type of a property (${property.describe()})`);
        }
        property.setOptions(propertyOptions);
      }

      if (isAttributeClass(PropertyClass)) {
        const descriptor = {
          configurable: true,
          enumerable: true,
          get() {
            return this.getAttribute(name).getValue();
          },
          set(value) {
            return this.getAttribute(name).setValue(value);
          }
        };

        if (returnDescriptor) {
          return descriptor;
        }

        Object.defineProperty(this, name, descriptor);
      }

      if (isMethodClass(PropertyClass) && methodCreator !== undefined) {
        Object.defineProperty(this, name, {
          value: methodCreator(name),
          writable: true,
          enumerable: false,
          configurable: true
        });
      }

      return property;
    },

    deleteProperty(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const properties = this.__getProperties();

      if (!hasOwnProperty(properties, name)) {
        if (throwIfMissing) {
          throw new Error(`Cannot delete a missing property (property name: '${name}')`);
        }
        return false;
      }

      delete properties[name];

      return true;
    },

    hasProperty(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getProperty(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getProperties(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          filter: ow.optional.function,
          attributesOnly: ow.optional.boolean,
          setAttributesOnly: ow.optional.boolean,
          methodsOnly: ow.optional.boolean,
          autoFork: ow.optional.boolean
        })
      );

      const {
        filter: originalFilter,
        attributesOnly = false,
        setAttributesOnly = false,
        methodsOnly = false,
        autoFork = true
      } = options;

      const component = this;

      const filter = createFilter(originalFilter, {attributesOnly, setAttributesOnly, methodsOnly});

      return {
        *[Symbol.iterator]() {
          for (const name of component.getPropertyNames()) {
            const property = component.getProperty(name, {autoFork});

            if (filter !== undefined && !filter.call(this, property)) {
              continue;
            }

            yield property;
          }
        }
      };
    },

    getPropertyNames() {
      const names = [];

      let currentObject = this;
      while ('__properties' in currentObject) {
        if (hasOwnProperty(currentObject, '__properties')) {
          const currentNames = Object.getOwnPropertyNames(currentObject.__properties);
          names.unshift(...currentNames);
        }
        currentObject = Object.getPrototypeOf(currentObject);
      }

      return Array.from(new Set(names));
    },

    __getProperties({autoCreateOrFork = true} = {}) {
      if (autoCreateOrFork) {
        if (!('__properties' in this)) {
          Object.defineProperty(this, '__properties', {value: Object.create(null)});
        } else if (!hasOwnProperty(this, '__properties')) {
          Object.defineProperty(this, '__properties', {value: Object.create(this.__properties)});
        }
      }

      return this.__properties;
    },

    // === Property exposure ===

    resolvePropertyOperationSetting(setting) {
      if (setting === true) {
        return true;
      }
    },

    normalizePropertyOperationSetting(setting, options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfInvalid: ow.optional.boolean}));

      const {throwIfInvalid = true} = options;

      if (setting === true) {
        return true;
      }

      if (throwIfInvalid) {
        throw new Error(
          `The specified property operation setting (${JSON.stringify(setting)}) is invalid`
        );
      }
    },

    // === Attributes ===

    getAttribute(name, options = {}) {
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

      if (!isAttribute(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not an attribute (${property.describe()})`
        );
      }

      return property;
    },

    setAttribute(name, propertyOptions = {}, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(propertyOptions, 'propertyOptions', ow.object);
      ow(options, 'options', ow.object);

      return this.setProperty(name, Attribute, propertyOptions, options);
    },

    hasAttribute(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getAttribute(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getAttributes(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          filter: ow.optional.function,
          setAttributesOnly: ow.optional.boolean,
          autoFork: ow.optional.boolean
        })
      );

      const {filter, setAttributesOnly = false, autoFork = true} = options;

      return this.getProperties({filter, attributesOnly: true, setAttributesOnly, autoFork});
    },

    // === Attribute selectors ===

    expandAttributeSelector(attributeSelector, options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          filter: ow.optional.function,
          depth: ow.optional.number,
          _attributeStack: ow.optional.set
        })
      );

      attributeSelector = AttributeSelector.normalize(attributeSelector);

      let {filter, depth = Number.MAX_SAFE_INTEGER, _attributeStack = new Set()} = options;

      if (depth < 0) {
        return attributeSelector;
      }

      depth -= 1;

      let expandedAttributeSelector = {};

      if (attributeSelector === false) {
        return expandedAttributeSelector; // Optimization
      }

      for (const attribute of this.getAttributes({filter})) {
        const name = attribute.getName();

        const subattributeSelector = AttributeSelector.get(attributeSelector, name);

        if (subattributeSelector === false) {
          continue;
        }

        if (_attributeStack.has(attribute)) {
          continue; // Avoid looping indefinitely when a circular attribute is encountered
        }

        _attributeStack.add(attribute);

        const expandedSubattributeSelector = attribute._expandAttributeSelector(
          subattributeSelector,
          {
            filter,
            depth,
            _attributeStack
          }
        );

        _attributeStack.delete(attribute);

        expandedAttributeSelector = AttributeSelector.set(
          expandedAttributeSelector,
          name,
          expandedSubattributeSelector
        );
      }

      return expandedAttributeSelector;
    },

    // === Methods ===

    getMethod(name, options = {}) {
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

      if (!isMethod(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a method (${property.describe()})`
        );
      }

      return property;
    },

    setMethod(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object);

      return this.setProperty(name, Method, options);
    },

    hasMethod(name) {
      ow(name, 'name', ow.string.nonEmpty);

      return this.getMethod(name, {throwIfMissing: false, autoFork: false}) !== undefined;
    },

    getMethods(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({filter: ow.optional.function, autoFork: ow.optional.boolean})
      );

      const {filter: originalFilter, autoFork = true} = options;

      const filter = function(property) {
        if (!isMethod(property)) {
          return false;
        }

        if (originalFilter !== undefined) {
          return originalFilter.call(this, property);
        }

        return true;
      };

      return this.getProperties({filter, autoFork});
    },

    // === Introspection ===

    introspectProperties() {
      const introspectedProperties = [];

      for (const property of this.getProperties()) {
        const introspectedProperty = property.introspect();

        if (introspectedProperty !== undefined) {
          introspectedProperties.push(introspectedProperty);
        }
      }

      return introspectedProperties;
    },

    unintrospectProperties(introspectedProperties, options = {}) {
      ow(introspectedProperties, 'introspectedProperties', ow.array);
      ow(options, 'options', ow.object.exactShape({methodCreator: ow.optional.function}));

      const {methodCreator} = options;

      for (const introspectedProperty of introspectedProperties) {
        const {type, ...introspectedPropertyWithoutType} = introspectedProperty;
        const PropertyClass = getClassOf(this).getPropertyClass(type);
        const {name, options} = PropertyClass.unintrospect(introspectedPropertyWithoutType);
        this.setProperty(name, PropertyClass, options, {methodCreator});
      }
    },

    // === Utilities ===

    isWithProperties(object) {
      return isWithProperties(object);
    }
  };

  Object.assign(WithProperties, classAndInstanceMethods);
  Object.assign(WithProperties.prototype, classAndInstanceMethods);

  return WithProperties;
};

export function isWithProperties(object) {
  return typeof object?.isWithProperties === 'function';
}

function createFilter(originalFilter, options = {}) {
  ow(originalFilter, 'originalFilter', ow.optional.function);
  ow(
    options,
    'options',
    ow.object.exactShape({
      attributesOnly: ow.optional.boolean,
      setAttributesOnly: ow.optional.boolean,
      methodsOnly: ow.optional.boolean
    })
  );

  const {attributesOnly = false, setAttributesOnly = false, methodsOnly = false} = options;

  const filter = function(property) {
    if ((attributesOnly || setAttributesOnly) && !isAttribute(property)) {
      return false;
    }

    if (setAttributesOnly && !property.isSet()) {
      return false;
    }

    if (methodsOnly && !isMethod(property)) {
      return false;
    }

    if (originalFilter !== undefined) {
      return originalFilter.call(this, property);
    }

    return true;
  };

  return filter;
}
