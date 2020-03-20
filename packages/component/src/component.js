import {hasOwnProperty, isPrototypeOf, getClassOf} from 'core-helpers';
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
  validateIsComponentClass,
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
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

    // === Component getter ===

    static getComponent(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({
          throwIfMissing: ow.optional.boolean,
          includePrototypes: ow.optional.boolean
        })
      );

      const {throwIfMissing = true, includePrototypes = false} = options;

      const isInstanceName =
        validateComponentName(name, {
          allowInstances: includePrototypes
        }) === 'componentInstanceName';

      const className = isInstanceName
        ? getComponentClassNameFromComponentInstanceName(name)
        : name;

      const Component = this.__getComponentClass(className, {throwIfMissing});

      if (Component !== undefined) {
        return isInstanceName ? Component.prototype : Component;
      }
    }

    static __getComponentClass(name, {throwIfMissing}) {
      if (this.getComponentName() === name) {
        return this;
      }

      const RelatedComponent = this.getRelatedComponent(name, {throwIfMissing: false});

      if (RelatedComponent !== undefined) {
        return RelatedComponent;
      }

      const layer = this.getLayer({throwIfMissing: false});

      if (layer !== undefined) {
        const RegisteredComponent = layer.getComponent(name, {throwIfMissing: false});

        if (RegisteredComponent !== undefined) {
          return RegisteredComponent;
        }
      }

      if (throwIfMissing) {
        throw new Error(
          `Cannot get the component class '${name}' from the current ${lowerFirst(
            this.getComponentType()
          )} (${this.describeComponent()})`
        );
      }
    }

    // === Related components ===

    static getRelatedComponent(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      validateComponentName(name, {allowInstances: false});

      const relatedComponents = this.__getRelatedComponents();

      const RelatedComponent = relatedComponents[name];

      if (RelatedComponent !== undefined) {
        return RelatedComponent;
      }

      if (throwIfMissing) {
        throw new Error(
          `Cannot get the related component class '${name}' (${this.describeComponent()})`
        );
      }
    }

    static registerRelatedComponent(Component) {
      validateIsComponentClass(Component);

      const relatedComponents = this.__getRelatedComponents();
      const componentName = Component.getComponentName();
      relatedComponents[componentName] = Component;
    }

    static getRelatedComponents(options = {}) {
      ow(options, 'options', ow.object.exactShape({filter: ow.optional.function}));

      const {filter} = options;

      const Component = this;

      return {
        *[Symbol.iterator]() {
          const relatedComponents = Component.__getRelatedComponents();

          // eslint-disable-next-line guard-for-in
          for (const name in relatedComponents) {
            const RelatedComponent = relatedComponents[name];

            if (filter !== undefined && !filter(RelatedComponent)) {
              continue;
            }

            yield RelatedComponent;
          }
        }
      };
    }

    static __getRelatedComponents() {
      if (this.__relatedComponents === undefined) {
        Object.defineProperty(this, '__relatedComponents', {
          value: Object.create(null)
        });
      } else if (!hasOwnProperty(this, '__relatedComponents')) {
        Object.defineProperty(this, '__relatedComponents', {
          value: Object.create(this.__relatedComponents)
        });
      }

      return this.__relatedComponents;
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

    static hasLayer() {
      return this.getLayer({throwIfMissing: false}) !== undefined;
    }

    hasLayer() {
      return this.constructor.hasLayer();
    }

    static __setLayer(layer) {
      Object.defineProperty(this, '__layer', {value: layer});
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

    // === Serialization ===

    static serialize(options = {}) {
      ow(options, 'options', ow.object);

      const serializedComponent = {__component: this.getComponentName()};

      return possiblyAsync(this.__serializeAttributes(serializedComponent, options), {
        then: () => serializedComponent
      });
    }

    serialize(options = {}) {
      ow(options, 'options', ow.object.partialShape({includeIsNewMark: ow.optional.boolean}));

      const {includeIsNewMark = true} = options;

      const serializedComponent = {__component: this.getComponentName()};

      if (includeIsNewMark && this.isNew()) {
        serializedComponent.__new = true;
      }

      return possiblyAsync(this.__serializeAttributes(serializedComponent, options), {
        then: () => serializedComponent
      });
    }

    // === Deserialization ===

    static deserialize(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object);

      const expectedComponentName = this.getComponentName();

      const {__component: componentName = expectedComponentName, ...attributes} = object;

      const isInstanceName = validateComponentName(componentName) === 'componentInstanceName';

      if (isInstanceName) {
        return this.prototype.deserialize(object, options);
      }

      if (componentName !== expectedComponentName) {
        throw new Error(
          `An unexpected component name was encountered while deserializing an object (encountered name: '${componentName}', expected name: '${expectedComponentName}')`
        );
      }

      const deserializedComponent = this;

      return possiblyAsync(deserializedComponent.__deserializeAttributes(attributes, options), {
        then: () => deserializedComponent
      });
    }

    deserialize(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object.partialShape({excludeIsNewMark: ow.optional.boolean}));

      const {excludeIsNewMark = false} = options;

      const expectedComponentName = this.getComponentName();

      const {__component: componentName = expectedComponentName, __new, ...attributes} = object;

      validateComponentName(componentName, {allowClasses: false});

      if (componentName !== expectedComponentName) {
        throw new Error(
          `An unexpected component name was encountered while deserializing an object (encountered name: '${componentName}', expected name: '${expectedComponentName}')`
        );
      }

      let isNew;

      if (!excludeIsNewMark) {
        isNew = __new ?? false;
      }

      const deserializedComponent = this.constructor.__instantiate(attributes, {isNew});

      return possiblyAsync(deserializedComponent.__deserializeAttributes(attributes, options), {
        then: () => deserializedComponent
      });
    }

    // === Introspection ===

    static introspect() {
      const introspectedProperties = this.introspectProperties();
      const introspectedPrototypeProperties = this.prototype.introspectProperties();

      if (introspectedProperties.length === 0 && introspectedPrototypeProperties.length === 0) {
        return undefined;
      }

      const introspectedComponent = {
        name: this.getComponentName(),
        type: this.getComponentType()
      };

      if (introspectedProperties.length > 0) {
        introspectedComponent.properties = introspectedProperties;
      }

      const introspectedRelatedComponents = this.__introspectRelatedComponents();

      if (introspectedRelatedComponents.length > 0) {
        introspectedComponent.relatedComponents = introspectedRelatedComponents;
      }

      if (introspectedPrototypeProperties.length > 0) {
        introspectedComponent.prototype = {properties: introspectedPrototypeProperties};
      }

      return introspectedComponent;
    }

    static __introspectRelatedComponents() {
      const introspectedRelatedComponents = [];

      for (const RelatedComponent of this.getRelatedComponents()) {
        if (
          RelatedComponent.introspectProperties().length > 0 ||
          RelatedComponent.prototype.introspectProperties().length > 0
        ) {
          introspectedRelatedComponents.push(RelatedComponent.getComponentName());
        }
      }

      return introspectedRelatedComponents;
    }

    static unintrospect(introspectedComponent) {
      ow(
        introspectedComponent,
        'introspectedComponent',
        ow.object.partialShape({
          name: ow.string.nonEmpty,
          properties: ow.optional.array,
          prototype: ow.optional.object.partialShape({properties: ow.optional.array})
        })
      );

      const {
        name,
        properties: introspectedProperties,
        prototype: {properties: introspectedPrototypeProperties} = {}
      } = introspectedComponent;

      this.setComponentName(name);

      if (introspectedProperties !== undefined) {
        this.unintrospectProperties(introspectedProperties);
      }

      if (introspectedPrototypeProperties !== undefined) {
        this.prototype.unintrospectProperties(introspectedPrototypeProperties);
      }
    }

    static getRemoteComponent() {
      return this.__RemoteComponent;
    }

    static __setRemoteComponent(RemoteComponent) {
      this.__RemoteComponent = RemoteComponent;
    }

    getRemoteComponent() {
      return this.constructor.getRemoteComponent()?.prototype;
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

    // === Serialization ===

    __serializeAttributes(serializedComponent, options) {
      ow(serializedComponent, 'serializedComponent', ow.object);
      ow(
        options,
        'options',
        ow.object.partialShape({
          attributeSelector: ow.optional.any,
          attributeFilter: ow.optional.function
        })
      );

      let {attributeSelector = true, attributeFilter} = options;

      attributeSelector = AttributeSelector.normalize(attributeSelector);

      if (attributeSelector === false) {
        return; // Optimization
      }

      return possiblyAsync.forEach(this.getAttributes({setAttributesOnly: true}), attribute => {
        const attributeName = attribute.getName();

        const subattributeSelector = AttributeSelector.get(attributeSelector, attributeName);

        if (subattributeSelector === false) {
          return;
        }

        return possiblyAsync(
          attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
          {
            then: isNotFilteredOut => {
              if (isNotFilteredOut) {
                const attributeValue = attribute.getValue();

                return possiblyAsync(
                  serialize(attributeValue, {...options, attributeSelector: subattributeSelector}),
                  {
                    then: serializedAttributeValue => {
                      serializedComponent[attributeName] = serializedAttributeValue;
                    }
                  }
                );
              }
            }
          }
        );
      });
    },

    // === Deserialization ===

    __deserializeAttributes(attributes, options) {
      ow(attributes, 'attributes', ow.object);
      ow(options, 'options', ow.object.partialShape({attributeFilter: ow.optional.function}));

      const {attributeFilter} = options;

      const componentGetter = name =>
        getClassOf(this).getComponent(name, {includePrototypes: true});

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

export class Component extends ComponentMixin() {
  static __ComponentMixin = ComponentMixin;
}
