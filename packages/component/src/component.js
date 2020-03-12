import {hasOwnProperty, isPrototypeOf, isClass} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import lowerFirst from 'lodash/lowerFirst';
import a from 'indefinite';
import ow from 'ow';

import {WithProperties} from './with-properties';
import {serialize} from './serialization';
import {deserialize} from './deserialization';
import {AttributeSelector} from './attribute-selector';
import {
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  validateIsComponentClassOrInstance,
  validateComponentName,
  getComponentInstanceNameFromComponentClassName,
  getTypeOf
} from './utilities';

export const ComponentMixin = (Base = Object) => {
  ow(Base, ow.function);

  if (isComponentClass(Base)) {
    return Base;
  }

  class ComponentMixin extends WithProperties(Base) {
    static getComponentType() {
      return 'Component';
    }

    getComponentType() {
      return getComponentInstanceNameFromComponentClassName(this.constructor.getComponentType());
    }

    // === Creation ===

    constructor(object = {}, options) {
      ow(object, 'object', ow.object);

      super(object, options);

      this.markAsNew();
    }

    static __instantiate(attributes = {}, options = {}) {
      ow(attributes, 'attributes', ow.object);
      ow(options, 'options', ow.object.exactShape({isNew: ow.optional.boolean}));

      const {isNew = false} = options;

      if (isNew === true) {
        let attributeSelector = this.prototype.expandAttributeSelector(true, {depth: 0});
        const deserializedAttributeSelector = AttributeSelector.fromNames(Object.keys(attributes));
        attributeSelector = AttributeSelector.remove(
          attributeSelector,
          deserializedAttributeSelector
        );

        return new this({}, {attributeSelector});
      }

      return Object.create(this.prototype);
    }

    // === Naming ===

    static getComponentName(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const name = this.__name ?? this.name;

      if (typeof name === 'string' && name !== '') {
        return name;
      }

      if (throwIfMissing) {
        throw new Error('The name of the component is missing');
      }
    }

    getComponentName(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      return getComponentInstanceNameFromComponentClassName(
        this.constructor.getComponentName(options)
      );
    }

    static setComponentName(name) {
      ow(name, 'name', ow.string);

      validateComponentName(name, {allowInstances: false});

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

    // === Layer registration ===

    static getLayer(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const layer = hasOwnProperty(this, '__layer') ? this.__layer : undefined;

      if (layer) {
        return layer;
      }

      if (throwIfMissing) {
        throw new Error(
          `Cannot get the layer of ${this.describeComponentType()} that is not registered (${this.describeComponent()})`
        );
      }
    }

    static get layer() {
      return this.getLayer();
    }

    getLayer(options) {
      return this.constructor.getLayer(options);
    }

    get layer() {
      return this.getLayer();
    }

    static setLayer(layer) {
      if (typeof layer?.constructor?.isLayer !== 'function') {
        throw new Error(`Expected a layer, but received a value of type '${getTypeOf(layer)}'`);
      }

      Object.defineProperty(this, '__layer', {value: layer});
    }

    static hasLayer() {
      return this.getLayer({throwIfMissing: false}) !== undefined;
    }

    hasLayer() {
      return this.constructor.hasLayer();
    }

    // === Forking ===

    static fork() {
      return class extends this {};
    }

    // eslint-disable-next-line no-unused-vars
    fork(Component) {
      // TODO: Altering the constructor sounds wrong
      // ow(Component, 'Component', ow.optional.function);

      const forkedComponent = Object.create(this);

      // if (Component !== undefined) {
      //   Object.defineProperty(forkedComponent, 'constructor', {
      //     value: Component,
      //     writable: true,
      //     enumerable: false,
      //     configurable: true
      //   });
      // }

      return forkedComponent;
    }

    // === Utilities ===

    static isComponent(object) {
      return isComponentInstance(object);
    }
  }

  const classAndInstanceMethods = {
    // === Forking ===

    isForkOf(component) {
      if (!isComponentClassOrInstance(component)) {
        throw new Error(
          `Expected a component, but received a value of type '${getTypeOf(component)}'`
        );
      }

      return isPrototypeOf(component, this);
    },

    // === Related components ===

    // TODO: Handle forking

    getRelatedComponent(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      validateComponentName(name);

      const relatedComponents = this.__getRelatedComponents();

      let relatedComponent = relatedComponents[name];

      if (relatedComponent !== undefined) {
        return relatedComponent;
      }

      const layer = this.getLayer({throwIfMissing: false});

      if (layer !== undefined) {
        relatedComponent = layer.getComponent(name, {
          throwIfMissing: false,
          includePrototypes: true
        });

        if (relatedComponent !== undefined) {
          return relatedComponent;
        }
      }

      if (throwIfMissing) {
        throw new Error(`Cannot get the related component '${name}' (${this.describeComponent()})`);
      }
    },

    registerRelatedComponent(component) {
      validateIsComponentClassOrInstance(component);

      const relatedComponents = this.__getRelatedComponents();
      const componentName = component.getComponentName();
      relatedComponents[componentName] = component;
    },

    getRelatedComponents() {
      return Object.values(this.__getRelatedComponents());
    },

    __getRelatedComponents() {
      if (this.__relatedComponents === undefined) {
        Object.defineProperty(this, '__relatedComponents', {
          value: Object.create(null),
          configurable: true
        });
      }

      return this.__relatedComponents;
    },

    // === Serialization ===

    serialize(options = {}) {
      ow(options, 'options', ow.object);

      const serializedComponent = {__component: this.getComponentName()};

      if (isComponentInstance(this) && this.isNew()) {
        serializedComponent.__new = true;
      }

      return possiblyAsync(this.__serializeAttributes(serializedComponent, options), {
        then: () => serializedComponent
      });
    },

    __serializeAttributes(serializedComponent, options) {
      ow(serializedComponent, 'serializedComponent', ow.object);
      ow(options, 'options', ow.object.partialShape({attributeFilter: ow.optional.function}));

      const {attributeFilter} = options;

      return possiblyAsync.forEach(this.getAttributes({setAttributesOnly: true}), attribute => {
        return possiblyAsync(
          attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
          {
            then: isNotFilteredOut => {
              if (isNotFilteredOut) {
                const attributeName = attribute.getName();
                const attributeValue = attribute.getValue();
                return possiblyAsync(serialize(attributeValue, options), {
                  then: serializedAttributeValue => {
                    serializedComponent[attributeName] = serializedAttributeValue;
                  }
                });
              }
            }
          }
        );
      });
    },

    // === Deserialization ===

    deserialize(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object);

      const expectedComponentName = this.getComponentName();

      const {__component: componentName = expectedComponentName, __new, ...attributes} = object;

      validateComponentName(componentName);

      if (componentName !== expectedComponentName) {
        throw new Error(
          `An unexpected component name was encountered while deserializing an object (encountered name: '${componentName}', expected name: '${expectedComponentName}')`
        );
      }

      const deserializedComponent = isComponentClass(this)
        ? this
        : this.constructor.__instantiate(attributes, {isNew: __new});

      return possiblyAsync(deserializedComponent.__deserializeAttributes(attributes, options), {
        then: () => deserializedComponent
      });
    },

    __deserializeAttributes(attributes, options) {
      ow(attributes, 'attributes', ow.object);
      ow(options, 'options', ow.object.partialShape({attributeFilter: ow.optional.function}));

      const {attributeFilter} = options;

      const componentGetter = name => this.getRelatedComponent(name);

      return possiblyAsync.forEach(
        Object.entries(attributes),
        ([attributeName, attributeValue]) => {
          const attribute = this.getAttribute(attributeName, {
            throwIfMissing: false
          });

          if (attribute === undefined) {
            return;
          }

          return possiblyAsync(
            attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
            {
              then: isNotFilteredOut => {
                if (isNotFilteredOut) {
                  return possiblyAsync(deserialize(attributeValue, {...options, componentGetter}), {
                    then: deserializedAttributeValue => {
                      attribute.setValue(deserializedAttributeValue);
                    }
                  });
                }
              }
            }
          );
        }
      );
    },

    // === Introspection ===

    introspect() {
      const introspectedProperties = this.introspectProperties();

      if (introspectedProperties.length === 0) {
        return undefined;
      }

      const introspectedComponent = {
        name: this.getComponentName(),
        type: this.getComponentType(),
        properties: introspectedProperties
      };

      const introspectedRelatedComponents = this.__introspectRelatedComponents();

      if (introspectedRelatedComponents.length > 0) {
        introspectedComponent.relatedComponents = introspectedRelatedComponents;
      }

      return introspectedComponent;
    },

    __introspectRelatedComponents() {
      const introspectedRelatedComponents = [];

      for (const relatedComponent of this.getRelatedComponents()) {
        if (relatedComponent.introspectProperties().length > 0) {
          introspectedRelatedComponents.push(relatedComponent.getComponentName());
        }
      }

      return introspectedRelatedComponents;
    },

    unintrospect(introspectedComponent, options = {}) {
      ow(
        introspectedComponent,
        'introspectedComponent',
        ow.object.partialShape({name: ow.string.nonEmpty, properties: ow.optional.array})
      );
      ow(options, 'options', ow.object.exactShape({methodCreator: ow.optional.function}));

      const {name, properties: introspectedProperties} = introspectedComponent;
      const {methodCreator} = options;

      if (isClass(this)) {
        this.setComponentName(name);
      }

      if (introspectedProperties !== undefined) {
        this.unintrospectProperties(introspectedProperties, {methodCreator});
      }
    },

    // === Utilities ===

    describeComponentType() {
      return a(lowerFirst(this.getComponentType()));
    },

    describeComponent(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          includeLayer: ow.optional.boolean,
          layerSuffix: ow.optional.string,
          componentSuffix: ow.optional.string
        })
      );

      let {includeLayer = true, layerSuffix, componentSuffix = ''} = options;

      if (componentSuffix !== '') {
        componentSuffix = `${componentSuffix} `;
      }

      let layerDescription = '';

      if (includeLayer) {
        const layer = this.getLayer({throwIfMissing: false});

        if (layer !== undefined) {
          layerDescription = layer.describe({layerSuffix});

          if (layerDescription !== '') {
            layerDescription = `${layerDescription}, `;
          }
        }
      }

      return `${layerDescription}${componentSuffix}${lowerFirst(
        this.getComponentType()
      )} name: '${this.getComponentName()}'`;
    }
  };

  Object.assign(ComponentMixin, classAndInstanceMethods);
  Object.assign(ComponentMixin.prototype, classAndInstanceMethods);

  return ComponentMixin;
};

export class Component extends ComponentMixin() {}
