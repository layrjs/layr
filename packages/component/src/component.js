import {hasOwnProperty, isPrototypeOf, getClassOf} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import lowerFirst from 'lodash/lowerFirst';
import a from 'indefinite';
import ow from 'ow';

import {WithProperties} from './with-properties';
import {clone} from './cloning';
import {merge} from './merging';
import {serialize} from './serialization';
import {deserialize} from './deserialization';
import {AttributeSelector} from './attribute-selector';
import {
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  validateIsComponentClass,
  validateIsComponentInstance,
  validateIsComponentClassOrInstance,
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

    static instantiate(identifiers = {}, options = {}) {
      ow(identifiers, 'identifiers', ow.object);
      ow(
        options,
        'options',
        ow.object.exactShape({
          isNew: ow.optional.boolean,
          attributeSelector: ow,
          attributeFilter: ow.optional.function
        })
      );

      const {isNew = false, attributeSelector = {}, attributeFilter} = options;

      const component = isNew
        ? new this({}, {attributeSelector: {}})
        : Object.create(this.prototype);

      return component.__finishInstantiation(identifiers, {
        isNew,
        attributeSelector,
        attributeFilter
      });
    }

    // === Naming ===

    static getComponentName(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      const name = this.name;

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

      Object.defineProperty(this, 'name', {value: name});
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

      let RelatedComponent = relatedComponents[name];

      if (RelatedComponent === undefined) {
        if (throwIfMissing) {
          throw new Error(
            `Cannot get the related component class '${name}' (${this.describeComponent()})`
          );
        }

        return undefined;
      }

      if (!hasOwnProperty(relatedComponents, name)) {
        // Since the component has been forked, the related component must be forked as well
        RelatedComponent = RelatedComponent.fork();
        relatedComponents[name] = RelatedComponent;
      }

      return RelatedComponent;
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

    // === Cloning ===

    static clone() {
      return this;
    }

    clone(options = {}) {
      ow(options, 'options', ow.object);

      const attributes = {};

      for (const attribute of this.getAttributes({setAttributesOnly: true})) {
        const name = attribute.getName();
        const value = attribute.getValue();

        attributes[name] = value;
      }

      const {identifierAttributes, otherAttributes} = this.__partitionAttributes(attributes);

      const clonedComponent = this.constructor.instantiate(identifierAttributes, {
        isNew: this.isNew()
      });

      if (clonedComponent === this) {
        return this; // Optimization
      }

      clonedComponent.__cloneAttributes(otherAttributes, options);

      return clonedComponent;
    }

    // === Forking ===

    static fork() {
      const name = this.getComponentName();

      // Use a little trick to make sure the generated subclass
      // has the 'name' attribute set properly
      const {[name]: ForkedComponent} = {[name]: class extends this {}};

      return ForkedComponent;
    }

    fork(options = {}) {
      ow(options, 'options', ow.object.exactShape({parentComponent: ow}));

      const {parentComponent} = options;

      const forkedComponent = Object.create(this);

      if (parentComponent !== undefined) {
        validateIsComponentClassOrInstance(parentComponent);

        const Component = getClassOf(parentComponent).getComponent(
          this.constructor.getComponentName()
        );

        if (this.constructor !== Component) {
          // Make 'forkedComponent' believe that it is an instance of 'Component'
          // It can happen when a nested entity is forked
          Object.defineProperty(forkedComponent, 'constructor', {
            value: Component,
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
      }

      return forkedComponent;
    }

    static [Symbol.hasInstance](instance) {
      // Since fork() can change the constructor of the forked instances,
      // we must change the behaviour of 'instanceof' so it can work as expected
      return instance.constructor === this || isPrototypeOf(this, instance.constructor);
    }

    // === Merging ===

    static merge(ForkedComponent, options = {}) {
      ow(options, 'options', ow.object);

      validateIsComponentClass(ForkedComponent);

      if (!isPrototypeOf(this, ForkedComponent)) {
        throw new Error('Cannot merge a component that is not a fork of the target component');
      }

      this.__mergeAttributes(ForkedComponent, options);

      return this;
    }

    merge(forkedComponent, options = {}) {
      ow(options, 'options', ow.object);

      validateIsComponentInstance(forkedComponent);

      if (!isPrototypeOf(this, forkedComponent)) {
        throw new Error('Cannot merge a component that is not a fork of the target component');
      }

      this.__mergeAttributes(forkedComponent, options);

      return this;
    }

    // === Detachment ===

    static detach() {
      this.__isDetached = true;
      return this;
    }

    static isDetached() {
      if (this.__isDetached === true) {
        return true;
      }

      const layer = this.getLayer({throwIfMissing: false});

      if (layer !== undefined && layer.isDetached()) {
        return true;
      }

      return false;
    }

    detach() {
      this.__isDetached = true;
      return this;
    }

    isDetached() {
      if (this.__isDetached === true) {
        return true;
      }

      if (this.constructor.isDetached() === true) {
        return true;
      }

      return false;
    }

    // === Serialization ===

    static serialize(options = {}) {
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

      const serializedComponent = {};

      if (includeComponentNames) {
        serializedComponent.__component = this.getComponentName();
      }

      if (returnComponentReferences) {
        if (referencedComponents !== undefined) {
          referencedComponents.add(this);
        }

        return serializedComponent;
      }

      return possiblyAsync(this.__serializeAttributes(serializedComponent, options), {
        then: () => serializedComponent
      });
    }

    serialize(options = {}) {
      ow(
        options,
        'options',
        ow.object.partialShape({
          includeComponentNames: ow.optional.boolean,
          includeIsNewMarks: ow.optional.boolean
        })
      );

      const {includeComponentNames = true, includeIsNewMarks = true} = options;

      const serializedComponent = {};

      if (includeComponentNames) {
        serializedComponent.__component = this.getComponentName();
      }

      if (includeIsNewMarks && this.isNew()) {
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

      const {__component: componentName, ...attributes} = object;

      if (componentName !== undefined) {
        const expectedComponentName = this.getComponentName();

        if (componentName !== expectedComponentName) {
          throw new Error(
            `An unexpected component name was encountered while deserializing an object (encountered name: '${componentName}', expected name: '${expectedComponentName}')`
          );
        }
      }

      return possiblyAsync(this.__deserializeAttributes(attributes, options), {
        then: () => this
      });
    }

    static deserializeInstance(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object);

      const {__component: componentName, __new: isNew = false, ...attributes} = object;
      const {attributeFilter} = options;

      if (componentName !== undefined) {
        const expectedComponentName = this.prototype.getComponentName();

        if (componentName !== expectedComponentName) {
          throw new Error(
            `An unexpected component name was encountered while deserializing an object (encountered name: '${componentName}', expected name: '${expectedComponentName}')`
          );
        }
      }

      const {identifierAttributes, otherAttributes} = this.prototype.__partitionAttributes(
        attributes
      );

      let attributeSelector;

      if (isNew) {
        // When deserializing a component, we must select the attributes that are not part
        // of the deserialization so they can be set to their default values
        attributeSelector = this.prototype.expandAttributeSelector(true, {depth: 0});
        const otherAttributeSelector = AttributeSelector.fromNames(Object.keys(otherAttributes));
        attributeSelector = AttributeSelector.remove(attributeSelector, otherAttributeSelector);
      } else {
        attributeSelector = {};
      }

      return possiblyAsync(
        this.instantiate(identifierAttributes, {
          isNew,
          attributeSelector,
          attributeFilter
        }),
        {
          then: instantiatedComponent =>
            possiblyAsync(instantiatedComponent.__deserializeAttributes(attributes, options), {
              then: () => instantiatedComponent
            })
        }
      );
    }

    deserialize(object = {}, options = {}) {
      ow(object, 'object', ow.object);
      ow(options, 'options', ow.object);

      const {__component: componentName, __new: isNew = false, ...attributes} = object;

      if (componentName !== undefined) {
        const expectedComponentName = this.getComponentName();

        if (componentName !== expectedComponentName) {
          throw new Error(
            `An unexpected component name was encountered while deserializing an object (encountered name: '${componentName}', expected name: '${expectedComponentName}')`
          );
        }
      }

      if (isNew && !this.isNew()) {
        throw new Error(
          `Cannot mark as new an existing non-new ${this.getComponentType()} (${this.describeComponent()})`
        );
      }

      if (!isNew && this.isNew()) {
        this.markAsNotNew();
      }

      return possiblyAsync(this.__deserializeAttributes(attributes, options), {
        then: () => this
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
    // === Cloning ===

    __cloneAttributes(attributeValues, options) {
      for (const [name, value] of Object.entries(attributeValues)) {
        const attribute = this.getAttribute(name);

        const clonedValue = clone(value, options);

        attribute.setValue(clonedValue);
      }
    },

    // === Forking ===

    isForkOf(component) {
      if (!isComponentClassOrInstance(component)) {
        throw new Error(
          `Expected a component, but received a value of type '${getTypeOf(component)}'`
        );
      }

      return isPrototypeOf(component, this);
    },

    // === Merging ===

    __mergeAttributes(forkedComponent, options) {
      for (const forkedAttribute of forkedComponent.getAttributes()) {
        const name = forkedAttribute.getName();

        const attribute = this.getAttribute(name);

        if (!forkedAttribute.isSet()) {
          if (attribute.isSet()) {
            attribute.unsetValue();
          }

          continue;
        }

        const forkedValue = forkedAttribute.getValue();
        const value = attribute.getValue({throwIfUnset: false});

        const mergedValue = merge(value, forkedValue, options);

        attribute.setValue(mergedValue);
      }
    },

    // === Serialization ===

    __serializeAttributes(serializedComponent, options) {
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
                  serialize(attributeValue, {
                    ...options,
                    attributeSelector: subattributeSelector,
                    returnComponentReferences: true
                  }),
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

    __deserializeAttributes(serializedAttributes, options) {
      const {attributeFilter} = options;

      const componentGetter = name =>
        getClassOf(this).getComponent(name, {includePrototypes: true});

      return possiblyAsync.forEach(
        Object.entries(serializedAttributes),
        ([attributeName, serializedAttributeValue]) => {
          const attribute = this.getAttribute(attributeName, {throwIfMissing: false});

          if (attribute === undefined) {
            return;
          }

          return possiblyAsync(
            attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
            {
              then: isNotFilteredOut => {
                if (isNotFilteredOut) {
                  return this.__deserializeAttribute(
                    attribute,
                    serializedAttributeValue,
                    componentGetter,
                    options
                  );
                }
              }
            }
          );
        }
      );
    },

    __deserializeAttribute(attribute, serializedAttributeValue, componentGetter, options) {
      // OPTIMIZE: Move this logic into the Attribute class so we can avoid deserializing two times
      // in case of in place deserialization of nested models

      return possiblyAsync(deserialize(serializedAttributeValue, {...options, componentGetter}), {
        then: newAttributeValue => {
          if (attribute.isSet()) {
            const previousAttributeValue = attribute.getValue();

            if (newAttributeValue === previousAttributeValue) {
              return; // Optimization
            }

            if (
              isComponentClassOrInstance(newAttributeValue) &&
              isComponentClassOrInstance(previousAttributeValue) &&
              newAttributeValue.getComponentName() === previousAttributeValue.getComponentName()
            ) {
              return previousAttributeValue.deserialize(serializedAttributeValue, options);
            }
          }

          attribute.setValue(newAttributeValue);
        }
      });
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
