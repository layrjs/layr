import {hasOwnProperty, isPrototypeOf, getTypeOf, PlainObject} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';

import {
  Property,
  PropertyOptions,
  PropertyOperationSetting,
  PropertyFilter,
  PropertyFilterSync,
  PropertyFilterAsync
} from './property';
import {Attribute, isAttributeClass, isAttributeInstance, AttributeOptions} from './attribute';
import {
  AttributeSelector,
  createAttributeSelectorFromNames,
  createAttributeSelectorFromAttributes,
  getFromAttributeSelector,
  setWithinAttributeSelector,
  mergeAttributeSelectors,
  removeFromAttributeSelector,
  normalizeAttributeSelector
} from './attribute-selector';
import {Method, isMethodInstance, MethodOptions} from './method';
import {clone, CloneOptions} from './cloning';
import {ForkOptions} from './forking';
import {merge, MergeOptions} from './merging';
import {serialize, SerializeOptions} from './serialization';
import {deserialize, DeserializeOptions} from './deserialization';
import {
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  assertIsComponentClass,
  assertIsComponentInstance,
  assertIsComponentClassOrInstance,
  ensureComponentClass,
  assertIsComponentName,
  getComponentNameFromComponentClassType,
  getComponentNameFromComponentInstanceType,
  assertIsComponentType,
  getComponentClassTypeFromComponentName,
  getComponentInstanceTypeFromComponentName
} from './utilities';

export type ComponentGetter = (name: string) => typeof Component | Component;

export type ExpandAttributeSelectorOptions = {
  filter?: PropertyFilterSync;
  depth?: number;
  includeReferencedEntities?: boolean;
  _isDeep?: boolean;
  _attributeStack?: Set<Attribute>;
};

export const ComponentMixin = (Base = Object) => {
  if (typeof (Base as any).isComponent === 'function') {
    return (Base as unknown) as typeof _Component;
  }

  const _Component = class extends Base {
    // === Creation ===

    constructor(object: PlainObject = {}, options: {attributeSelector?: AttributeSelector} = {}) {
      const {attributeSelector = true} = options;

      super();

      return this.__finishInstantiation(object, {
        isNew: true,
        attributeSelector,
        attributeFilter: undefined,
        initialize: false
      }) as this;
    }

    // TODO: Remove
    // static test(attributeFilter: PropertyFilter) {
    //   const component = this.instantiate({}, {attributeFilter});
    // }

    static instantiate<T extends typeof Component>(
      this: T,
      object: PlainObject | undefined,
      options: {
        isNew?: boolean;
        attributeSelector?: AttributeSelector;
        attributeFilter: PropertyFilterAsync;
        initialize?: boolean;
      }
    ): PromiseLike<InstanceType<T>>;
    static instantiate<T extends typeof Component>(
      this: T,
      object: PlainObject | undefined,
      options: {
        isNew?: boolean;
        attributeSelector?: AttributeSelector;
        attributeFilter?: PropertyFilter;
        initialize: false;
      }
    ): InstanceType<T>;
    static instantiate<T extends typeof Component>(
      this: T,
      object?: PlainObject,
      options?: {
        isNew?: boolean;
        attributeSelector?: AttributeSelector;
        attributeFilter?: PropertyFilter;
        initialize?: boolean;
      }
    ): ReturnType<InstanceType<T>['initialize']> extends PromiseLike<void>
      ? PromiseLike<InstanceType<T>>
      : InstanceType<T>;
    static instantiate<T extends typeof Component>(
      this: T,
      object: PlainObject = {},
      options: {
        isNew?: boolean;
        attributeSelector?: AttributeSelector;
        attributeFilter?: PropertyFilter;
        initialize?: boolean;
      } = {}
    ) {
      const {isNew = false, attributeSelector = {}, attributeFilter, initialize = true} = options;

      const component = isNew
        ? new this({}, {attributeSelector: {}})
        : (Object.create(this.prototype) as InstanceType<T>);

      return component.__finishInstantiation(object, {
        isNew,
        attributeSelector,
        attributeFilter,
        initialize
      });
    }

    __finishInstantiation(
      object: PlainObject,
      options: {
        isNew: boolean;
        attributeSelector: AttributeSelector;
        attributeFilter: PropertyFilter | undefined;
        initialize: boolean;
      }
    ) {
      const {isNew, attributeSelector, attributeFilter, initialize} = options;

      if (isNew) {
        this.markAsNew();
      }

      // Always include attributes present in the specified object
      const fullAttributeSelector = mergeAttributeSelectors(
        attributeSelector,
        createAttributeSelectorFromNames(Object.keys(object))
      );

      return possiblyAsync(
        possiblyAsync.forEach(
          this.getAttributes({attributeSelector: fullAttributeSelector}),
          (attribute) => {
            if (attribute.isSet()) {
              // This can happen when an entity was returned from the entity manager
              return;
            }

            return possiblyAsync(
              attributeFilter !== undefined
                ? (attributeFilter as PropertyFilterAsync).call(this, attribute)
                : true,
              (isNotFilteredOut) => {
                if (isNotFilteredOut) {
                  const name = attribute.getName();
                  const value = hasOwnProperty(object, name)
                    ? object[name]
                    : isNew
                    ? attribute.getDefault()
                    : undefined;
                  attribute.setValue(value);
                }
              }
            );
          }
        ),
        () => {
          if (initialize) {
            return possiblyAsync(this.initialize(), () => this);
          }

          return this;
        }
      );
    }

    // === Initialization ===

    // Override these methods to initialize components after instantiation or deserialization

    static initialize() {}

    initialize() {}

    // === Naming ===

    static getBaseComponentName() {
      return 'Component';
    }

    static getComponentName() {
      const name = this.name;

      if (typeof name === 'string' && name !== '') {
        return name;
      }

      throw new Error('The name of the component is missing');
    }

    static setComponentName(name: string) {
      assertIsComponentName(name);

      Object.defineProperty(this, 'name', {value: name});
    }

    // === Typing ===

    static getBaseComponentType() {
      return getComponentClassTypeFromComponentName(this.getBaseComponentName());
    }

    getBaseComponentType() {
      return getComponentInstanceTypeFromComponentName(
        (this.constructor as typeof Component).getBaseComponentName()
      );
    }

    static getComponentType() {
      return getComponentClassTypeFromComponentName(this.getComponentName());
    }

    getComponentType() {
      return getComponentInstanceTypeFromComponentName(
        (this.constructor as typeof Component).getComponentName()
      );
    }

    // === isNew mark ===

    __isNew: boolean | undefined;

    isNew() {
      return this.__isNew === true;
    }

    markAsNew() {
      Object.defineProperty(this, '__isNew', {value: true, configurable: true});
    }

    markAsNotNew() {
      Object.defineProperty(this, '__isNew', {value: false, configurable: true});
    }

    // === Properties ===

    static getPropertyClass(type: string) {
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

    static get getProperty() {
      return this.prototype.getProperty;
    }

    getProperty(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        throw new Error(`The property '${name}' is missing (${this.describeComponent()})`);
      }

      return property;
    }

    static get hasProperty() {
      return this.prototype.hasProperty;
    }

    hasProperty(name: string) {
      return this.__getProperty(name, {autoFork: false}) !== undefined;
    }

    static get __getProperty() {
      return this.prototype.__getProperty;
    }

    __getProperty(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const properties = this.__getProperties();

      let property = properties[name];

      if (property === undefined) {
        return undefined;
      }

      if (autoFork && property.getParent() !== this) {
        property = property.fork(this);
        properties[name] = property;
      }

      return property;
    }

    static get setProperty() {
      return this.prototype.setProperty;
    }

    setProperty<T extends typeof Property>(
      name: string,
      PropertyClass: T,
      propertyOptions: PropertyOptions = {},
      options: {returnDescriptor?: boolean} = {}
    ): InstanceType<T> | PropertyDescriptor {
      const {returnDescriptor = false} = options;

      let property = this.hasProperty(name) ? this.getProperty(name) : undefined;

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
        const descriptor: PropertyDescriptor = {
          configurable: true,
          enumerable: true,
          get(this: typeof Component | Component): any {
            return this.getAttribute(name).getValue();
          },
          set(this: typeof Component | Component, value: any): void {
            this.getAttribute(name).setValue(value);
          }
        };

        if (returnDescriptor) {
          return descriptor;
        }

        Object.defineProperty(this, name, descriptor);
      }

      return property as InstanceType<T>;
    }

    static get deleteProperty() {
      return this.prototype.deleteProperty;
    }

    deleteProperty(name: string) {
      const properties = this.__getProperties();

      if (!hasOwnProperty(properties, name)) {
        return false;
      }

      delete properties[name];

      return true;
    }

    static get getProperties() {
      return this.prototype.getProperties;
    }

    getProperties<PropertyType extends Property = Property>(
      options: {
        filter?: PropertyFilterSync;
        autoFork?: boolean;
      } & CreatePropertyFilterOptions = {}
    ) {
      const {
        filter: originalFilter,
        autoFork = true,
        attributesOnly = false,
        attributeSelector = true,
        setAttributesOnly = false,
        methodsOnly = false
      } = options;

      const component = this;

      const filter = createPropertyFilter(originalFilter, {
        attributesOnly,
        attributeSelector,
        setAttributesOnly,
        methodsOnly
      });

      return {
        *[Symbol.iterator]() {
          for (const name of component.getPropertyNames()) {
            const property = component.getProperty(name, {autoFork});

            if (filter.call(component, property)) {
              yield property as PropertyType;
            }
          }
        }
      };
    }

    static __properties?: {[name: string]: Property};

    __properties?: {[name: string]: Property};

    static get getPropertyNames() {
      return this.prototype.getPropertyNames;
    }

    getPropertyNames() {
      const names = [];

      let currentObject: {__properties: any} = (this as unknown) as {__properties: any};
      while ('__properties' in currentObject) {
        if (hasOwnProperty(currentObject, '__properties')) {
          const currentNames = Object.getOwnPropertyNames(currentObject.__properties);
          names.unshift(...currentNames);
        }
        currentObject = Object.getPrototypeOf(currentObject);
      }

      return Array.from(new Set(names));
    }

    static get __getProperties() {
      return this.prototype.__getProperties;
    }

    __getProperties({autoCreateOrFork = true} = {}) {
      if (autoCreateOrFork) {
        if (!('__properties' in this)) {
          Object.defineProperty(this, '__properties', {value: Object.create(null)});
        } else if (!hasOwnProperty(this, '__properties')) {
          Object.defineProperty(this, '__properties', {value: Object.create(this.__properties!)});
        }
      }

      return this.__properties!;
    }

    // === Property exposure ===

    static normalizePropertyOperationSetting(
      setting: PropertyOperationSetting,
      options: {throwIfInvalid?: boolean} = {}
    ): PropertyOperationSetting | undefined {
      const {throwIfInvalid = true} = options;

      if (setting === true) {
        return true;
      }

      if (throwIfInvalid) {
        throw new Error(
          `The specified property operation setting (${JSON.stringify(setting)}) is invalid`
        );
      }

      return undefined;
    }

    static get resolvePropertyOperationSetting() {
      return this.prototype.resolvePropertyOperationSetting;
    }

    resolvePropertyOperationSetting(setting: PropertyOperationSetting) {
      if (setting === true) {
        return true;
      }

      return undefined;
    }

    // === Attributes ===

    static get getAttribute() {
      return this.prototype.getAttribute;
    }

    getAttribute(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const attribute = this.__getAttribute(name, {autoFork});

      if (attribute === undefined) {
        throw new Error(`The attribute '${name}' is missing (${this.describeComponent()})`);
      }

      return attribute;
    }

    static get hasAttribute() {
      return this.prototype.hasAttribute;
    }

    hasAttribute(name: string) {
      return this.__getAttribute(name, {autoFork: false}) !== undefined;
    }

    static get __getAttribute() {
      return this.prototype.__getAttribute;
    }

    __getAttribute(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isAttributeInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not an attribute (${property.describe()})`
        );
      }

      return property;
    }

    static get setAttribute() {
      return this.prototype.setAttribute;
    }

    setAttribute(
      name: string,
      attributeOptions: AttributeOptions = {},
      options: {returnDescriptor?: boolean} = {}
    ) {
      return this.setProperty(name, Attribute, attributeOptions, options);
    }

    static get getAttributes() {
      return this.prototype.getAttributes;
    }

    getAttributes(
      options: {
        filter?: PropertyFilterSync;
        autoFork?: boolean;
      } & CreatePropertyFilterOptionsForAttributes = {}
    ) {
      const {
        filter,
        attributeSelector = true,
        setAttributesOnly = false,
        autoFork = true
      } = options;

      return this.getProperties<Attribute>({
        filter,
        autoFork,
        attributesOnly: true,
        attributeSelector,
        setAttributesOnly
      });
    }

    // === Identifier attributes ===

    getIdentifierAttributes(_options = {}) {
      // Identifier attributes are implemented in the Entity subclass
      // For other subclasses, return an empty iterable

      return {
        *[Symbol.iterator]() {}
      };
    }

    __partitionAttributes(object: PlainObject) {
      const identifierAttributes: PlainObject = {};
      const otherAttributes: PlainObject = {};

      const identifierAttributeSelector = createAttributeSelectorFromAttributes(
        this.getIdentifierAttributes()
      );

      for (const [name, value] of Object.entries(object)) {
        if (getFromAttributeSelector(identifierAttributeSelector, name) === true) {
          identifierAttributes[name] = value;
        } else {
          otherAttributes[name] = value;
        }
      }

      return {identifierAttributes, otherAttributes};
    }

    __getMinimumAttributeCount() {
      return 0;
    }

    // === Attribute selectors ===

    static get getAttributeSelector() {
      return this.prototype.getAttributeSelector;
    }

    getAttributeSelector(options: {setAttributesOnly?: boolean} = {}) {
      const {setAttributesOnly = false} = options;

      let attributeSelector: AttributeSelector = {};

      for (const attribute of this.getAttributes({setAttributesOnly})) {
        const name = attribute.getName();

        attributeSelector = setWithinAttributeSelector(attributeSelector, name, true);
      }

      return attributeSelector;
    }

    static get expandAttributeSelector() {
      return this.prototype.expandAttributeSelector;
    }

    expandAttributeSelector(
      attributeSelector: AttributeSelector,
      options: ExpandAttributeSelectorOptions = {}
    ) {
      attributeSelector = normalizeAttributeSelector(attributeSelector);

      let {
        filter,
        depth = Number.MAX_SAFE_INTEGER,
        includeReferencedEntities = false,
        _attributeStack = new Set()
      } = options;

      if (depth < 0) {
        return attributeSelector;
      }

      depth -= 1;

      let expandedAttributeSelector: AttributeSelector = {};

      if (attributeSelector === false) {
        return expandedAttributeSelector; // Optimization
      }

      for (const attribute of this.getAttributes({filter})) {
        const name = attribute.getName();

        const subattributeSelector = getFromAttributeSelector(attributeSelector, name);

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
            includeReferencedEntities,
            _isDeep: true,
            _attributeStack
          }
        );

        _attributeStack.delete(attribute);

        expandedAttributeSelector = setWithinAttributeSelector(
          expandedAttributeSelector,
          name,
          expandedSubattributeSelector
        );
      }

      return expandedAttributeSelector;
    }

    // === Methods ===

    static get getMethod() {
      return this.prototype.getMethod;
    }

    getMethod(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const method = this.__getMethod(name, {autoFork});

      if (method === undefined) {
        throw new Error(`The method '${name}' is missing (${this.describeComponent()})`);
      }

      return method;
    }

    static get hasMethod() {
      return this.prototype.hasMethod;
    }

    hasMethod(name: string) {
      return this.__getMethod(name, {autoFork: false}) !== undefined;
    }

    static get __getMethod() {
      return this.prototype.__getMethod;
    }

    __getMethod(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isMethodInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a method (${property.describe()})`
        );
      }

      return property;
    }

    static get setMethod() {
      return this.prototype.setMethod;
    }

    setMethod(
      name: string,
      methodOptions: MethodOptions = {},
      options: {returnDescriptor?: boolean} = {}
    ) {
      return this.setProperty(name, Method, methodOptions, options);
    }

    static get getMethods() {
      return this.prototype.getMethods;
    }

    getMethods(options: {filter?: PropertyFilterSync; autoFork?: boolean} = {}) {
      const {filter, autoFork = true} = options;

      return this.getProperties<Method>({filter, autoFork, methodsOnly: true});
    }

    // === Component getter ===

    static getComponent(name: string) {
      const component = this.__getComponent(name);

      if (component === undefined) {
        throw new Error(
          `Cannot get the component '${name}' (${this.describeComponent({
            componentPrefix: 'from'
          })})`
        );
      }

      return component;
    }

    static hasComponent(name: string) {
      return this.__getComponent(name) !== undefined;
    }

    static __getComponent(name: string) {
      assertIsComponentName(name);

      return this.getComponentName() === name ? this : this.getRelatedComponent(name);
    }

    static getComponentOfType(type: string) {
      const component = this.__getComponentOfType(type);

      if (component === undefined) {
        throw new Error(
          `Cannot get the component '${type}' (${this.describeComponent({
            componentPrefix: 'from'
          })})`
        );
      }

      return component;
    }

    static hasComponentOfType(type: string) {
      return this.__getComponentOfType(type) !== undefined;
    }

    static __getComponentOfType(type: string) {
      const isComponentClassType = assertIsComponentType(type) === 'componentClassType';

      const componentName = isComponentClassType
        ? getComponentNameFromComponentClassType(type)
        : getComponentNameFromComponentInstanceType(type);

      const component = this.__getComponent(componentName);

      if (component === undefined) {
        return undefined;
      }

      return isComponentClassType ? component : component.prototype;
    }

    // === Related components ===

    static getRelatedComponent(name: string) {
      assertIsComponentName(name);

      const relatedComponents = this.__getRelatedComponents();

      let relatedComponent = relatedComponents[name];

      if (relatedComponent === undefined) {
        return undefined;
      }

      if (!hasOwnProperty(relatedComponents, name)) {
        // Since the component has been forked, the related component must be forked as well
        relatedComponent = relatedComponent.fork();
        relatedComponents[name] = relatedComponent;
      }

      return relatedComponent;
    }

    static registerRelatedComponent(relatedComponent: typeof Component) {
      assertIsComponentClass(relatedComponent);

      const relatedComponents = this.__getRelatedComponents();
      const componentName = relatedComponent.getComponentName();
      relatedComponents[componentName] = relatedComponent;
    }

    static getRelatedComponents(
      options: {filter?: (relatedComponent: typeof Component) => boolean} = {}
    ) {
      const {filter} = options;

      const component = this;

      return {
        *[Symbol.iterator]() {
          for (const name in component.__getRelatedComponents()) {
            const relatedComponent = component.getRelatedComponent(name)!;

            if (filter !== undefined && !filter(relatedComponent)) {
              continue;
            }

            yield relatedComponent;
          }
        }
      };
    }

    static __relatedComponents: {[name: string]: typeof Component};

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

    // === Cloning ===

    static clone() {
      return this;
    }

    // TODO: Remove
    // static test() {
    //   const component = new this();
    //   const clonedComponent = component.clone();
    // }

    clone<T extends Component>(this: T, options: CloneOptions = {}) {
      const attributes: PlainObject = {};

      for (const attribute of this.getAttributes({setAttributesOnly: true})) {
        const name = attribute.getName();
        const value = attribute.getValue();

        attributes[name] = value;
      }

      const {identifierAttributes, otherAttributes} = this.__partitionAttributes(attributes);

      const clonedComponent = (this.constructor as typeof Component).instantiate(
        identifierAttributes,
        {
          isNew: this.isNew(),
          initialize: false
        }
      );

      if (clonedComponent === this) {
        return this;
      }

      clonedComponent.__cloneAttributes(otherAttributes, options);

      return possiblyAsync(clonedComponent.initialize(), () => clonedComponent);
    }

    __cloneAttributes(attributeValues: PlainObject, options: CloneOptions) {
      for (const [name, value] of Object.entries(attributeValues)) {
        const attribute = this.getAttribute(name);

        const clonedValue = clone(value, options);

        attribute.setValue(clonedValue);
      }
    }

    // === Forking ===

    // TODO: Remove
    // static test() {
    //   const ForkedComponent = Component.fork();
    // }

    static fork<T extends typeof Component>(this: T) {
      const name = this.getComponentName();

      // Use a little trick to make sure the generated subclass
      // has the 'name' attribute set properly
      // @ts-ignore
      const {[name]: forkedComponent} = {[name]: class extends this {}};

      return forkedComponent as T;
    }

    // TODO: Remove
    // static test() {
    //   const component = new Component();
    //   const forkedComponent = component.fork();
    // }

    fork<T extends Component>(this: T, options: ForkOptions = {}) {
      const {parentComponent} = options;

      const forkedComponent = Object.create(this) as T;

      if (parentComponent !== undefined) {
        assertIsComponentClassOrInstance(parentComponent);

        const component = ensureComponentClass(parentComponent).getComponent(
          (this.constructor as typeof Component).getComponentName()
        );

        if (this.constructor !== component) {
          // Make 'forkedComponent' believe that it is an instance of 'Component'
          // It can happen when a nested entity is forked
          Object.defineProperty(forkedComponent, 'constructor', {
            value: component,
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
      }

      return forkedComponent;
    }

    static isForkOf(component: typeof Component) {
      assertIsComponentClass(component);

      return isPrototypeOf(component, this);
    }

    isForkOf(component: Component) {
      assertIsComponentInstance(component);

      return isPrototypeOf(component, this);
    }

    static [Symbol.hasInstance](instance: any) {
      // Since fork() can change the constructor of the forked instances,
      // we must change the behavior of 'instanceof' so it can work as expected
      return instance.constructor === this || isPrototypeOf(this, instance.constructor);
    }

    // static getGhost() {
    //   const layer = this.getLayer({throwIfMissing: false});

    //   if (layer === undefined) {
    //     throw new Error(
    //       `Cannot get the ghost of ${this.describeComponentType()} class that is not registered into a layer (${this.describeComponent()})`
    //     );
    //   }

    //   return this.layer.getGhost().getComponent(this.getComponentName());
    // }

    // static get ghost() {
    //   return this.getGhost();
    // }

    // getGhost() {
    //   throw new Error(
    //     `Cannot get the ghost of a component that is not managed by an entity manager (${this.describeComponent()})`
    //   );
    // }

    // get ghost() {
    //   return this.getGhost();
    // }

    // === Merging ===

    static merge(forkedComponent: typeof Component, options: MergeOptions = {}) {
      assertIsComponentClass(forkedComponent);

      if (!isPrototypeOf(this, forkedComponent)) {
        throw new Error('Cannot merge a component that is not a fork of the target component');
      }

      this.__mergeAttributes(forkedComponent, options);

      return this;
    }

    merge(forkedComponent: Component, options: MergeOptions = {}) {
      assertIsComponentInstance(forkedComponent);

      if (!isPrototypeOf(this, forkedComponent)) {
        throw new Error('Cannot merge a component that is not a fork of the target component');
      }

      this.__mergeAttributes(forkedComponent, options);

      return this;
    }

    static get __mergeAttributes() {
      return this.prototype.__mergeAttributes;
    }

    __mergeAttributes(forkedComponent: typeof Component | Component, options: MergeOptions) {
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
    }

    // === Detachment ===

    // static detach() {
    //   this.__isDetached = true;
    //   return this;
    // }

    // static isDetached() {
    //   if (this.__isDetached === true) {
    //     return true;
    //   }

    //   const layer = this.getLayer({throwIfMissing: false});

    //   if (layer !== undefined && layer.isDetached()) {
    //     return true;
    //   }

    //   return false;
    // }

    // detach() {
    //   this.__isDetached = true;
    //   return this;
    // }

    // isDetached() {
    //   if (this.__isDetached === true) {
    //     return true;
    //   }

    //   if ((this.constructor as typeof Component).isDetached() === true) {
    //     return true;
    //   }

    //   return false;
    // }

    // === Serialization ===

    static serialize(options: SerializeOptions = {}) {
      const {
        returnComponentReferences = false,
        referencedComponents,
        ignoreEmptyComponents = false,
        includeComponentTypes = true
      } = options;

      if (returnComponentReferences && !includeComponentTypes) {
        throw new Error(
          `The 'returnComponentReferences' option cannot be 'true' when the 'includeComponentTypes' option is 'false' (${this.describeComponent()})`
        );
      }

      const serializedComponent: PlainObject = {};

      if (includeComponentTypes) {
        serializedComponent.__component = this.getComponentType();
      }

      if (returnComponentReferences) {
        if (referencedComponents !== undefined) {
          for (const RelatedComponent of this.getRelatedComponents()) {
            referencedComponents.add(RelatedComponent);
          }

          referencedComponents.add(this);
        }

        return serializedComponent;
      }

      return possiblyAsync(
        this.__serializeAttributes(serializedComponent, options),
        (attributeCount) =>
          ignoreEmptyComponents && attributeCount === 0 ? undefined : serializedComponent
      );
    }

    serialize(options: SerializeOptions = {}) {
      const {
        returnComponentReferences = false,
        referencedComponents,
        ignoreEmptyComponents = false,
        includeComponentTypes = true,
        includeIsNewMarks = true
      } = options;

      const serializedComponent: PlainObject = {};

      if (includeComponentTypes) {
        serializedComponent.__component = this.getComponentType();
      }

      if (includeIsNewMarks && this.isNew()) {
        serializedComponent.__new = true;
      }

      if (returnComponentReferences && referencedComponents !== undefined) {
        for (const relatedComponent of (this
          .constructor as typeof Component).getRelatedComponents()) {
          referencedComponents.add(relatedComponent);
        }

        referencedComponents.add(this.constructor as typeof Component);
      }

      return possiblyAsync(
        this.__serializeAttributes(serializedComponent, options),
        (attributeCount) =>
          ignoreEmptyComponents && attributeCount <= this.__getMinimumAttributeCount()
            ? undefined
            : serializedComponent
      );
    }

    static get __serializeAttributes() {
      return this.prototype.__serializeAttributes;
    }

    __serializeAttributes(serializedComponent: PlainObject, options: SerializeOptions) {
      let {includeReferencedEntities = false, attributeSelector = true, attributeFilter} = options;

      attributeSelector = normalizeAttributeSelector(attributeSelector);

      let attributeCount = 0;

      return possiblyAsync(
        possiblyAsync.forEach(this.getAttributes({setAttributesOnly: true}), (attribute) => {
          const attributeName = attribute.getName();

          const subattributeSelector = getFromAttributeSelector(attributeSelector, attributeName);

          if (subattributeSelector === false) {
            return;
          }

          return possiblyAsync(
            attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
            (isNotFilteredOut) => {
              if (isNotFilteredOut) {
                const attributeValue = attribute.getValue();

                return possiblyAsync(
                  serialize(attributeValue, {
                    ...options,
                    attributeSelector: subattributeSelector,
                    returnComponentReferences: !includeReferencedEntities
                  }),
                  (serializedAttributeValue) => {
                    serializedComponent[attributeName] = serializedAttributeValue;
                    attributeCount++;
                  }
                );
              }
            }
          );
        }),
        () => attributeCount
      );
    }

    // === Deserialization ===

    static deserialize<T extends typeof Component>(
      this: T,
      object: PlainObject = {},
      options: DeserializeOptions = {}
    ): T | PromiseLike<T> {
      const {__component: componentType, ...attributes} = object;

      if (componentType !== undefined) {
        const expectedComponentType = this.getComponentType();

        if (componentType !== expectedComponentType) {
          throw new Error(
            `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
          );
        }
      }

      return this.__finishDeserialization(attributes, options);
    }

    static deserializeInstance<T extends typeof Component>(
      this: T,
      object: PlainObject = {},
      options: DeserializeOptions = {}
    ): InstanceType<T> | PromiseLike<InstanceType<T>> {
      const {__component: componentType, __new: isNew = false, ...attributes} = object;
      const {attributeFilter} = options;

      if (componentType !== undefined) {
        const expectedComponentType = this.prototype.getComponentType();

        if (componentType !== expectedComponentType) {
          throw new Error(
            `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
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
        const otherAttributeSelector = createAttributeSelectorFromNames(
          Object.keys(otherAttributes)
        );
        attributeSelector = removeFromAttributeSelector(attributeSelector, otherAttributeSelector);
      } else {
        attributeSelector = {};
      }

      return possiblyAsync(
        this.instantiate(identifierAttributes, {
          isNew,
          attributeSelector,
          attributeFilter,
          initialize: false
        }),
        (instantiatedComponent) =>
          instantiatedComponent.__finishDeserialization(attributes, options)
      );
    }

    deserialize<T extends Component>(
      this: T,
      object: PlainObject = {},
      options: DeserializeOptions = {}
    ): T | PromiseLike<T> {
      const {__component: componentType, __new: isNew = false, ...attributes} = object;

      if (componentType !== undefined) {
        const expectedComponentType = this.getComponentType();

        if (componentType !== expectedComponentType) {
          throw new Error(
            `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
          );
        }
      }

      if (isNew && !this.isNew()) {
        throw new Error(
          `Cannot mark as new an existing non-new component (${this.describeComponent()})`
        );
      }

      if (!isNew && this.isNew()) {
        this.markAsNotNew();
      }

      return this.__finishDeserialization(attributes, options);
    }

    static get __finishDeserialization() {
      return this.prototype.__finishDeserialization;
    }

    __finishDeserialization<T extends typeof Component | Component>(
      this: T,
      serializedAttributes: PlainObject,
      options: DeserializeOptions
    ): T | PromiseLike<T> {
      const {attributeFilter} = options;

      const componentGetter = (name: string) => ensureComponentClass(this).getComponentOfType(name);

      return possiblyAsync(
        possiblyAsync.forEach(
          Object.entries(serializedAttributes),
          ([attributeName, serializedAttributeValue]: [string, any]) => {
            if (!this.hasAttribute(attributeName)) {
              return;
            }

            const attribute = this.getAttribute(attributeName);

            return possiblyAsync(
              attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
              (isNotFilteredOut) => {
                if (isNotFilteredOut) {
                  return this.__deserializeAttribute(
                    attribute,
                    serializedAttributeValue,
                    componentGetter,
                    options
                  );
                }
              }
            );
          }
        ),
        () => possiblyAsync(this.initialize(), () => this)
      );
    }

    static get __deserializeAttribute() {
      return this.prototype.__deserializeAttribute;
    }

    __deserializeAttribute(
      attribute: Attribute,
      serializedAttributeValue: any,
      componentGetter: ComponentGetter,
      options: DeserializeOptions
    ): void | PromiseLike<void> {
      // OPTIMIZE: Move this logic into the Attribute class so we can avoid deserializing two times
      // in case of in place deserialization of nested models

      return possiblyAsync(
        deserialize(serializedAttributeValue, {...options, componentGetter}),
        (newAttributeValue): any => {
          if (attribute.isSet()) {
            const previousAttributeValue = attribute.getValue();

            if (newAttributeValue === previousAttributeValue) {
              return; // Optimization
            }

            if (
              isComponentClassOrInstance(newAttributeValue) &&
              newAttributeValue.getComponentType() === previousAttributeValue.getComponentType()
            ) {
              if (isComponentClass(previousAttributeValue)) {
                return previousAttributeValue.deserialize(serializedAttributeValue, options);
              }
              if (isComponentInstance(previousAttributeValue)) {
                return previousAttributeValue.deserialize(serializedAttributeValue, options);
              }
            }
          }

          attribute.setValue(newAttributeValue);
        }
      );
    }

    // === Introspection ===

    // static introspect() {
    //   const introspectedProperties = this.introspectProperties();
    //   const introspectedPrototypeProperties = this.prototype.introspectProperties();

    //   if (introspectedProperties.length === 0 && introspectedPrototypeProperties.length === 0) {
    //     return undefined;
    //   }

    //   const introspectedComponent = {
    //     name: this.getComponentName(),
    //     type: this.getComponentType()
    //   };

    //   if (introspectedProperties.length > 0) {
    //     introspectedComponent.properties = introspectedProperties;
    //   }

    //   const introspectedRelatedComponents = this.__introspectRelatedComponents();

    //   if (introspectedRelatedComponents.length > 0) {
    //     introspectedComponent.relatedComponents = introspectedRelatedComponents;
    //   }

    //   if (introspectedPrototypeProperties.length > 0) {
    //     introspectedComponent.prototype = {properties: introspectedPrototypeProperties};
    //   }

    //   return introspectedComponent;
    // }

    // static __introspectRelatedComponents() {
    //   const introspectedRelatedComponents = [];

    //   for (const RelatedComponent of this.getRelatedComponents()) {
    //     if (
    //       RelatedComponent.introspectProperties().length > 0 ||
    //       RelatedComponent.prototype.introspectProperties().length > 0
    //     ) {
    //       introspectedRelatedComponents.push(RelatedComponent.getComponentName());
    //     }
    //   }

    //   return introspectedRelatedComponents;
    // }

    // static unintrospect(introspectedComponent) {
    //   ow(
    //     introspectedComponent,
    //     'introspectedComponent',
    //     ow.object.partialShape({
    //       name: ow.string.nonEmpty,
    //       properties: ow.optional.array,
    //       prototype: ow.optional.object.partialShape({properties: ow.optional.array})
    //     })
    //   );

    //   const {
    //     name,
    //     properties: introspectedProperties,
    //     prototype: {properties: introspectedPrototypeProperties} = {}
    //   } = introspectedComponent;

    //   this.setComponentName(name);

    //   if (introspectedProperties !== undefined) {
    //     this.unintrospectProperties(introspectedProperties);
    //   }

    //   if (introspectedPrototypeProperties !== undefined) {
    //     this.prototype.unintrospectProperties(introspectedPrototypeProperties);
    //   }
    // }

    // static get introspectProperties() {
    //   return this.prototype.introspectProperties;
    // }

    // introspectProperties() {
    //   const introspectedProperties = [];

    //   for (const property of this.getProperties({autoFork: false})) {
    //     const introspectedProperty = property.introspect();

    //     if (introspectedProperty !== undefined) {
    //       introspectedProperties.push(introspectedProperty);
    //     }
    //   }

    //   return introspectedProperties;
    // }

    // static get unintrospectProperties() {
    //   return this.prototype.unintrospectProperties;
    // }

    // unintrospectProperties(introspectedProperties) {
    //   ow(introspectedProperties, 'introspectedProperties', ow.array);

    //   for (const introspectedProperty of introspectedProperties) {
    //     const {type, ...introspectedPropertyWithoutType} = introspectedProperty;
    //     const PropertyClass = getClassOf(this).getPropertyClass(type);
    //     const {name, options} = PropertyClass.unintrospect(introspectedPropertyWithoutType);
    //     this.setProperty(name, PropertyClass, options);
    //   }
    // }

    // static getRemoteComponent() {
    //   return this.__RemoteComponent;
    // }

    // static __setRemoteComponent(RemoteComponent) {
    //   this.__RemoteComponent = RemoteComponent;
    // }

    // getRemoteComponent() {
    //   return (this.constructor as typeof Component).getRemoteComponent()?.prototype;
    // }

    // === Utilities ===

    static isComponent(value: any): value is Component {
      return isComponentInstance(value);
    }

    static get describeComponent() {
      return this.prototype.describeComponent;
    }

    describeComponent(options: {componentPrefix?: string} = {}): string {
      let {componentPrefix = ''} = options;

      if (componentPrefix !== '') {
        componentPrefix = `${componentPrefix} `;
      }

      return `${componentPrefix}component: '${ensureComponentClass(this).getComponentName()}'`;
    }
  };

  type CreatePropertyFilterOptions = {
    attributesOnly?: boolean;
    methodsOnly?: boolean;
  } & CreatePropertyFilterOptionsForAttributes;

  type CreatePropertyFilterOptionsForAttributes = {
    attributeSelector?: AttributeSelector;
    setAttributesOnly?: boolean;
  };

  function createPropertyFilter(
    originalFilter?: PropertyFilterSync,
    options: CreatePropertyFilterOptions = {}
  ) {
    const {
      attributesOnly = false,
      attributeSelector = true,
      setAttributesOnly = false,
      methodsOnly = false
    } = options;

    const normalizedAttributeSelector = normalizeAttributeSelector(attributeSelector);

    const filter = function (this: typeof Component | Component, property: Property) {
      if (isAttributeInstance(property)) {
        const attribute = property;

        if (setAttributesOnly && !attribute.isSet()) {
          return false;
        }

        const name = attribute.getName();

        if (getFromAttributeSelector(normalizedAttributeSelector, name) === false) {
          return false;
        }
      } else if (attributesOnly) {
        return false;
      }

      if (isMethodInstance(property)) {
        // NOOP
      } else if (methodsOnly) {
        return false;
      }

      if (originalFilter !== undefined) {
        return originalFilter.call(this, property);
      }

      return true;
    };

    return filter;
  }

  Object.defineProperty(_Component, '__ComponentMixin', {value: ComponentMixin});

  return _Component;
};

export class Component extends ComponentMixin() {}
