import {Observable} from '@liaison/observable';
import {
  hasOwnProperty,
  isPrototypeOf,
  getTypeOf,
  PlainObject,
  isPlainObject,
  PromiseLikeable,
  getFunctionName,
  assertIsFunction
} from 'core-helpers';
import {possiblyAsync} from 'possibly-async';
import cuid from 'cuid';

import {
  Property,
  PropertyOptions,
  PropertyOperationSetting,
  PropertyFilter,
  PropertyFilterSync,
  PropertyFilterAsync,
  IntrospectedProperty,
  Attribute,
  isAttributeClass,
  isAttributeInstance,
  AttributeOptions,
  IntrospectedAttribute,
  IdentifierAttribute,
  isIdentifierAttributeInstance,
  PrimaryIdentifierAttribute,
  isPrimaryIdentifierAttributeInstance,
  SecondaryIdentifierAttribute,
  isSecondaryIdentifierAttributeInstance,
  IdentifierValue,
  AttributeSelector,
  createAttributeSelectorFromNames,
  createAttributeSelectorFromAttributes,
  getFromAttributeSelector,
  setWithinAttributeSelector,
  mergeAttributeSelectors,
  normalizeAttributeSelector,
  Method,
  isMethodInstance,
  MethodOptions,
  IntrospectedMethod
} from './properties';
import {IdentityMap} from './identity-map';
import {clone, CloneOptions} from './cloning';
import {ForkOptions} from './forking';
import {merge, MergeOptions} from './merging';
import {SerializeOptions} from './serialization';
import {deserialize, DeserializeOptions} from './deserialization';
import {
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  assertIsComponentClass,
  assertIsComponentInstance,
  ensureComponentClass,
  assertIsComponentName,
  getComponentNameFromComponentClassType,
  getComponentNameFromComponentInstanceType,
  assertIsComponentType,
  getComponentClassTypeFromComponentName,
  getComponentInstanceTypeFromComponentName,
  joinAttributePath
} from './utilities';

export type ComponentSet = Set<typeof Component | Component>;

export type ComponentGetter = (type: string) => typeof Component | Component;

export type ComponentMixin = (Base: typeof Component) => typeof Component;

export type TraverseAttributesIteratee = (attribute: Attribute) => void;

export type TraverseAttributesOptions = {
  attributeSelector: AttributeSelector;
  setAttributesOnly: boolean;
};

export type IdentifierObject = {[name: string]: IdentifierValue};

export type IdentifierDescriptor = NormalizedIdentifierDescriptor | string | number;

export type NormalizedIdentifierDescriptor = {[name: string]: IdentifierValue};

export type ResolveAttributeSelectorOptions = {
  filter?: PropertyFilterSync;
  setAttributesOnly?: boolean;
  target?: number;
  aggregationMode?: 'union' | 'intersection';
  includeReferencedComponents?: boolean;
  alwaysIncludePrimaryIdentifierAttributes?: boolean;
  allowPartialArrayItems?: boolean;
  depth?: number;
  _isDeep?: boolean;
  _skipUnchangedAttributes?: boolean;
  _isArrayItem?: boolean;
  _attributeStack?: Set<Attribute>;
};

type MethodBuilder = (name: string) => Function;

export type IntrospectedComponent = {
  name: string;
  isEmbedded?: boolean;
  mixins?: string[];
  properties?: (IntrospectedProperty | IntrospectedAttribute | IntrospectedMethod)[];
  prototype?: {
    properties?: (IntrospectedProperty | IntrospectedAttribute | IntrospectedMethod)[];
  };
  providedComponents?: IntrospectedComponent[];
  consumedComponents?: string[];
};

type IntrospectedComponentMap = Map<typeof Component, IntrospectedComponent | undefined>;

/**
 * The base class of all your components
 */
export class Component extends Observable(Object) {
  ['constructor']: typeof Component;

  // === Creation ===

  /**
   * Creates an instance of a component class.
   *
   * @param object An optional object specifying the initial value of the instance attributes.
   */
  constructor(object: PlainObject = {}) {
    super();

    this.markAsNew();

    for (const attribute of this.getAttributes()) {
      const name = attribute.getName();
      let value;

      if (hasOwnProperty(object, name)) {
        value = object[name];
      } else {
        if (attribute.isControlled()) {
          continue; // Controlled attributes should not be set
        }

        value = attribute.evaluateDefault();
      }

      attribute.setValue(value);
      attribute._fixDecoration();
    }
  }

  /**
   * Creates an instance of a component class.
   *
   * @param object An optional object specifying the initial value of the instance attributes.
   * @param options.isNew Whether the instance should be marked as new or not (default: `true`).
   * @param options.source The source of the created instance (default: `0`).
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be set (default: `true` which means that all the attributes will be set).
   * @param options.attributeFilter A (possibly async) function used to filter the attributes to be set. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param options.initialize Whether to call the `initialize` instance method or not (default: `true`).
   * @returns An instance of the component class (possibly a promise if `options.attributeFilter` is an async function or `options.initialize` is `true` and the class has an async `initialize` instance method).
   */
  static create<T extends typeof Component>(
    this: T,
    object: PlainObject | null | undefined,
    options: {
      isNew?: boolean;
      source?: number;
      attributeSelector?: AttributeSelector;
      attributeFilter: PropertyFilterAsync;
      initialize?: boolean;
    }
  ): PromiseLike<InstanceType<T>>;
  static create<T extends typeof Component>(
    this: T,
    object: PlainObject | null | undefined,
    options: {
      isNew?: boolean;
      source?: number;
      attributeSelector?: AttributeSelector;
      attributeFilter?: PropertyFilter;
      initialize: false;
    }
  ): InstanceType<T>;
  static create<T extends typeof Component>(
    this: T,
    object?: PlainObject | null,
    options?: {
      isNew?: boolean;
      source?: number;
      attributeSelector?: AttributeSelector;
      attributeFilter?: PropertyFilter;
      initialize?: boolean;
    }
  ): ReturnType<InstanceType<T>['initialize']> extends PromiseLike<void>
    ? PromiseLike<InstanceType<T>>
    : InstanceType<T>;
  static create<T extends typeof Component>(
    this: T,
    object: PlainObject = {},
    options: {
      isNew?: boolean;
      source?: number;
      attributeSelector?: AttributeSelector;
      attributeFilter?: PropertyFilter;
      initialize?: boolean;
    } = {}
  ) {
    const {
      isNew = true,
      source,
      attributeSelector = isNew ? true : {},
      attributeFilter,
      initialize = true
    } = options;

    const component: Component = Object.create(this.prototype);

    component.setIsNewMark(isNew, {source});

    // Always include attributes present in the specified object
    const fullAttributeSelector = mergeAttributeSelectors(
      attributeSelector,
      createAttributeSelectorFromNames(Object.keys(object))
    );

    return possiblyAsync(
      possiblyAsync.forEach(
        component.getAttributes({attributeSelector: fullAttributeSelector}),
        (attribute) => {
          return possiblyAsync(
            attributeFilter !== undefined ? attributeFilter.call(component, attribute) : true,
            (isNotFilteredOut) => {
              if (isNotFilteredOut) {
                const name = attribute.getName();
                let value;

                if (hasOwnProperty(object, name)) {
                  value = object[name];
                } else {
                  if (attribute.isControlled()) {
                    return; // Controlled attributes should not be set
                  }

                  value = isNew ? attribute.evaluateDefault() : undefined;
                }

                attribute.setValue(value, {source});
              }
            }
          );
        }
      ),
      () => (initialize ? possiblyAsync(component.initialize(), () => component) : component)
    );
  }

  // === Initialization ===

  /**
   * A (possibly async) method that is called automatically when a component class is deserialized. You can override this method in your component subclasses to implement your initialization logic.
   */
  static initialize() {}

  /**
   * A (possibly async) method that is called automatically when a component instance is created or deserialized. You can override this method in your component subclasses to implement your initialization logic.
   */
  initialize() {}

  // === Naming ===

  static getBaseComponentName() {
    return 'Component';
  }

  /**
   * Returns the name of a component.
   *
   * @returns The name of a component.
   */
  static getComponentName() {
    const name = this.name;

    if (typeof name === 'string' && name !== '') {
      return name;
    }

    throw new Error('The name of the component is missing');
  }

  /**
   * Sets the name of a component. As the name of a component is usually inferred from the name of its class, this method should not be used so often.
   */
  static setComponentName(name: string) {
    assertIsComponentName(name);

    Object.defineProperty(this, 'name', {value: name});
  }

  /**
   * Returns the path of a component starting from its root component.
   *
   * For example, if a `Backend` component provides a `Movie` component, this method will return `'Backend.Movie'` when called on the `Movie` component.
   *
   * @returns A string representing the path of a component.
   */
  static getComponentPath() {
    let path: string[] = [];
    let currentComponent = this;

    while (true) {
      path.unshift(currentComponent.getComponentName());

      const componentProvider = currentComponent.getComponentProvider();

      if (componentProvider === currentComponent) {
        break;
      }

      currentComponent = componentProvider;
    }

    return path.join('.');
  }

  // === Typing ===

  static getBaseComponentType() {
    return getComponentClassTypeFromComponentName(this.getBaseComponentName());
  }

  getBaseComponentType() {
    return getComponentInstanceTypeFromComponentName(this.constructor.getBaseComponentName());
  }

  /**
   * Returns the type of a component class. A component class type is composed of the component class name prefixed with the string `'typeof '`.
   *
   * For example, with a component class named `'Movie'`, this method will return `'typeof Movie'`.
   *
   * @returns A string representing the type of a component class.
   */
  static getComponentType() {
    return getComponentClassTypeFromComponentName(this.getComponentName());
  }

  /**
   * Returns the type of a component instance. A component instance type is equivalent to the component class name.
   *
   * For example, with a component class named `'Movie'`, this method will return `'Movie'` when called on a `Movie` instance.
   */
  getComponentType() {
    return getComponentInstanceTypeFromComponentName(this.constructor.getComponentName());
  }

  // === isNew mark ===

  __isNew: boolean | undefined;

  /**
   * Returns whether a component instance is marked as new or not.
   *
   * @alias `isNew`
   *
   * @returns A boolean.
   */
  getIsNewMark() {
    return this.__isNew === true;
  }

  /**
   * Sets whether a component instance is marked as new or not.
   *
   * @param isNew A boolean specifying if the component instance should be marked as new or not.
   */
  setIsNewMark(isNew: boolean, {source}: {source?: number} = {}) {
    Object.defineProperty(this, '__isNew', {value: isNew, configurable: true});
    this.setIsNewMarkSource(source);
  }

  /**
   * Returns whether a component instance is marked as new or not.
   *
   * @returns A boolean.
   */
  isNew() {
    return this.getIsNewMark();
  }

  /**
   * Marks a component instance as new.
   */
  markAsNew({source}: {source?: number} = {}) {
    this.setIsNewMark(true, {source});
  }

  /**
   * Marks a component instance as not new.
   */
  markAsNotNew({source}: {source?: number} = {}) {
    this.setIsNewMark(false, {source});
  }

  // === isNew mark source ===

  __isNewSource: number | undefined;

  getIsNewMarkSource() {
    return this.__isNewSource !== undefined ? this.__isNewSource : 0;
  }

  setIsNewMarkSource(source = 0) {
    Object.defineProperty(this, '__isNewSource', {value: source, configurable: true});
  }

  // === Embeddability ===

  static isEmbedded() {
    return false;
  }

  // === Properties ===

  static getPropertyClass(type: string) {
    if (type === 'Property') {
      return Property;
    }

    if (type === 'Attribute') {
      return Attribute;
    }

    if (type === 'PrimaryIdentifierAttribute') {
      return PrimaryIdentifierAttribute;
    }

    if (type === 'SecondaryIdentifierAttribute') {
      return SecondaryIdentifierAttribute;
    }

    if (type === 'Method') {
      return Method;
    }

    throw new Error(`The specified property type ('${type}') is unknown`);
  }

  /**
   * Gets a property of a component.
   *
   * @param name The name of the property to get.
   *
   * @returns A `Property` instance.
   */
  static get getProperty() {
    return this.prototype.getProperty;
  }

  /**
   * Gets a property of a component.
   *
   * @param name The name of the property to get.
   *
   * @returns A `Property` instance.
   */
  getProperty(name: string, options: {autoFork?: boolean} = {}) {
    const {autoFork = true} = options;

    const property = this.__getProperty(name, {autoFork});

    if (property === undefined) {
      throw new Error(`The property '${name}' is missing (${this.describeComponent()})`);
    }

    return property;
  }

  /**
   * Returns whether a component as the specified property.
   *
   * @param name The name of the property to check.
   *
   * @returns A boolean.
   */
  static get hasProperty() {
    return this.prototype.hasProperty;
  }

  /**
   * Returns whether a component as the specified property.
   *
   * @param name The name of the property to check.
   *
   * @returns A boolean.
   */
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

  /**
   * Defines a property in a component. Typically, instead of using this method, you would rather use a decorator such as `@attribute` or `@method`.
   *
   * @param name The name of the property to define.
   * @param PropertyClass The class of the property (e.g., `Attribute`, `Method`) to use.
   * @param propertyOptions The options to be passed to the `PropertyClass` constructor.
   *
   * @returns The property that was created.
   */
  static get setProperty() {
    return this.prototype.setProperty;
  }

  /**
   * Defines a property in a component. Typically, instead of using this method, you would rather use a decorator such as `@attribute` or `@method`.
   *
   * @param name The name of the property to define.
   * @param PropertyClass The class of the property (e.g., `Attribute`, `Method`) to use.
   * @param propertyOptions The options to be passed to the `PropertyClass` constructor.
   *
   * @returns The property that was created.
   */
  setProperty<T extends typeof Property>(
    name: string,
    PropertyClass: T,
    propertyOptions?: PropertyOptions
  ): InstanceType<T>;
  setProperty(name: string, PropertyClass: typeof Property, propertyOptions: PropertyOptions = {}) {
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
        get(this: typeof Component | Component) {
          return this.getAttribute(name).getValue();
        },
        set(this: typeof Component | Component, value: any): void {
          this.getAttribute(name).setValue(value);
        }
      };

      Object.defineProperty(this, name, descriptor);
    }

    return property;
  }

  /**
   * Removes a property from a component. If the specified property doesn't exist, nothing happens.
   *
   * @param name The name of the property to remove.
   *
   * @returns A boolean.
   */
  static get deleteProperty() {
    return this.prototype.deleteProperty;
  }

  /**
   * Removes a property from a component. If the specified property doesn't exist, nothing happens.
   *
   * @param name The name of the property to remove.
   *
   * @returns A boolean.
   */
  deleteProperty(name: string) {
    const properties = this.__getProperties();

    if (!hasOwnProperty(properties, name)) {
      return false;
    }

    delete properties[name];

    return true;
  }

  /**
   * Returns an iterator providing the properties of a component.
   *
   * @param options.filter A function used to filter the properties to be returned. The function is invoked for each property with a `Property` instance as first argument.
   * @param options.attributesOnly A boolean specifying whether only attribute properties should be returned (default: `false`).
   * @param options.setAttributesOnly A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be returned (default: `true` which means that all the attributes should be returned).
   * @param options.methodsOnly A boolean specifying whether only method properties should be returned (default: `false`).
   *
   * @returns A `Property` instance iterator.
   */
  static get getProperties() {
    return this.prototype.getProperties;
  }

  /**
   * Returns an iterator providing the properties of a component.
   *
   * @param options.filter A function used to filter the properties to be returned. The function is invoked for each property with a `Property` instance as first argument.
   * @param options.attributesOnly A boolean specifying whether only attribute properties should be returned (default: `false`).
   * @param options.setAttributesOnly A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be returned (default: `true` which means that all the attributes should be returned).
   * @param options.methodsOnly A boolean specifying whether only method properties should be returned (default: `false`).
   *
   * @returns A `Property` instance iterator.
   */
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

  /**
   * Returns the name of all the properties of a component.
   *
   * @returns An array of the property names.
   */
  static get getPropertyNames() {
    return this.prototype.getPropertyNames;
  }

  /**
   * Returns the name of all the properties of a component.
   *
   * @returns An array of the property names.
   */
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

  resolvePropertyOperationSetting(
    setting: PropertyOperationSetting
  ): PromiseLikeable<boolean | undefined> {
    if (setting === true) {
      return true;
    }

    return undefined;
  }

  // === Attributes ===

  __constructorSourceCode?: string; // Used by @attribute() decorator

  /**
   * Gets an attribute of a component.
   *
   * @param name The name of the attribute to get.
   *
   * @returns An `Attribute` instance.
   */
  static get getAttribute() {
    return this.prototype.getAttribute;
  }

  /**
   * Gets an attribute of a component.
   *
   * @param name The name of the attribute to get.
   *
   * @returns An `Attribute` instance.
   */
  getAttribute(name: string, options: {autoFork?: boolean} = {}) {
    const {autoFork = true} = options;

    const attribute = this.__getAttribute(name, {autoFork});

    if (attribute === undefined) {
      throw new Error(`The attribute '${name}' is missing (${this.describeComponent()})`);
    }

    return attribute;
  }

  /**
   * Returns whether a component as the specified attribute.
   *
   * @param name The name of the attribute to check.
   *
   * @returns A boolean.
   */
  static get hasAttribute() {
    return this.prototype.hasAttribute;
  }

  /**
   * Returns whether a component as the specified attribute.
   *
   * @param name The name of the attribute to check.
   *
   * @returns A boolean.
   */
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

  /**
   * Defines an attribute in a component. Typically, instead of using this method, you would rather use the `@attribute()` decorator.
   *
   * @param name The name of the attribute to define.
   * @param attributeOptions The options to be passed to the `Attribute` constructor.
   *
   * @returns The `Attribute` that was created.
   */
  static get setAttribute() {
    return this.prototype.setAttribute;
  }

  /**
   * Defines an attribute in a component. Typically, instead of using this method, you would rather use the `@attribute()` decorator.
   *
   * @param name The name of the attribute to define.
   * @param attributeOptions The options to be passed to the `Attribute` constructor.
   *
   * @returns The `Attribute` that was created.
   */
  setAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, Attribute, attributeOptions);
  }

  /**
   * Returns an iterator providing the attributes of a component.
   *
   * @param options.filter A function used to filter the attributes to be returned. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param options.setAttributesOnly A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be returned (default: `true` which means that all the attributes should be returned).
   *
   * @returns An `Attribute` instance iterator.
   */
  static get getAttributes() {
    return this.prototype.getAttributes;
  }

  /**
   * Returns an iterator providing the attributes of a component.
   *
   * @param options.filter A function used to filter the attributes to be returned. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param options.setAttributesOnly A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be returned (default: `true` which means that all the attributes should be returned).
   *
   * @returns An `Attribute` instance iterator.
   */
  getAttributes<AttributeType extends Attribute = Attribute>(
    options: {
      filter?: PropertyFilterSync;
      autoFork?: boolean;
    } & CreatePropertyFilterOptionsForAttributes = {}
  ) {
    const {filter, attributeSelector = true, setAttributesOnly = false, autoFork = true} = options;

    return this.getProperties<AttributeType>({
      filter,
      autoFork,
      attributesOnly: true,
      attributeSelector,
      setAttributesOnly
    });
  }

  static get traverseAttributes() {
    return this.prototype.traverseAttributes;
  }

  traverseAttributes(
    iteratee: TraverseAttributesIteratee,
    options: Partial<TraverseAttributesOptions> & ResolveAttributeSelectorOptions = {}
  ) {
    assertIsFunction(iteratee);

    const {
      attributeSelector = true,
      filter,
      setAttributesOnly = false,
      depth = Number.MAX_SAFE_INTEGER,
      includeReferencedComponents = false
    } = options;

    const resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
      filter,
      setAttributesOnly,
      depth,
      includeReferencedComponents
    });

    this.__traverseAttributes(iteratee, {
      attributeSelector: resolvedAttributeSelector,
      setAttributesOnly
    });
  }

  static get __traverseAttributes() {
    return this.prototype.__traverseAttributes;
  }

  __traverseAttributes(
    iteratee: TraverseAttributesIteratee,
    {attributeSelector, setAttributesOnly}: TraverseAttributesOptions
  ) {
    for (const attribute of this.getAttributes({attributeSelector})) {
      if (setAttributesOnly && !attribute.isSet()) {
        continue;
      }

      const name = attribute.getName();
      const subattributeSelector = getFromAttributeSelector(attributeSelector, name);

      if (subattributeSelector !== false) {
        iteratee(attribute);
      }

      attribute._traverseAttributes(iteratee, {
        attributeSelector: subattributeSelector,
        setAttributesOnly
      });
    }
  }

  // === Identifier attributes ===

  /**
   * Gets an identifier attribute of a component.
   *
   * @param name The name of the identifier attribute to get.
   *
   * @returns An `IdentifierAttribute` instance.
   */
  getIdentifierAttribute(name: string, options: {autoFork?: boolean} = {}) {
    const {autoFork = true} = options;

    const identifierAttribute = this.__getIdentifierAttribute(name, {autoFork});

    if (identifierAttribute === undefined) {
      throw new Error(
        `The identifier attribute '${name}' is missing (${this.describeComponent()})`
      );
    }

    return identifierAttribute;
  }

  /**
   * Returns whether a component as the specified identifier attribute.
   *
   * @param name The name of the identifier attribute to check.
   *
   * @returns A boolean.
   */
  hasIdentifierAttribute(name: string) {
    return this.__getIdentifierAttribute(name, {autoFork: false}) !== undefined;
  }

  __getIdentifierAttribute(name: string, options: {autoFork: boolean}) {
    const {autoFork} = options;

    const property = this.__getProperty(name, {autoFork});

    if (property === undefined) {
      return undefined;
    }

    if (!isIdentifierAttributeInstance(property)) {
      throw new Error(
        `A property with the specified name was found, but it is not an identifier attribute (${property.describe()})`
      );
    }

    return property;
  }

  /**
   * Gets the primary identifier attribute of a component.
   *
   * @returns A `PrimaryIdentifierAttribute` instance.
   */
  getPrimaryIdentifierAttribute(options: {autoFork?: boolean} = {}) {
    const {autoFork = true} = options;

    const primaryIdentifierAttribute = this.__getPrimaryIdentifierAttribute({autoFork});

    if (primaryIdentifierAttribute === undefined) {
      throw new Error(
        `The component '${this.constructor.getComponentName()}' doesn't have a primary identifier attribute`
      );
    }

    return primaryIdentifierAttribute;
  }

  /**
   * Returns whether a component as a primary identifier attribute.
   *
   * @returns A boolean.
   */
  hasPrimaryIdentifierAttribute() {
    return this.__getPrimaryIdentifierAttribute({autoFork: false}) !== undefined;
  }

  __getPrimaryIdentifierAttribute(options: {autoFork: boolean}) {
    const {autoFork} = options;

    for (const identifierAttribute of this.getIdentifierAttributes({autoFork})) {
      if (isPrimaryIdentifierAttributeInstance(identifierAttribute)) {
        return identifierAttribute;
      }
    }

    return undefined;
  }

  /**
   * Defines the primary identifier attribute of a component. Typically, instead of using this method, you would rather use the `@primaryIdentifier()` decorator.
   *
   * @param name The name of the primary identifier attribute to define.
   * @param attributeOptions The options to be passed to the `PrimaryIdentifierAttribute` constructor.
   *
   * @returns The `PrimaryIdentifierAttribute` that was created.
   */
  setPrimaryIdentifierAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, PrimaryIdentifierAttribute, attributeOptions);
  }

  /**
   * Gets a secondary identifier attribute of a component.
   *
   * @param name The name of the secondary identifier attribute to get.
   *
   * @returns A `SecondaryIdentifierAttribute` instance.
   */
  getSecondaryIdentifierAttribute(name: string, options: {autoFork?: boolean} = {}) {
    const {autoFork = true} = options;

    const secondaryIdentifierAttribute = this.__getSecondaryIdentifierAttribute(name, {autoFork});

    if (secondaryIdentifierAttribute === undefined) {
      throw new Error(
        `The secondary identifier attribute '${name}' is missing (${this.describeComponent()})`
      );
    }

    return secondaryIdentifierAttribute;
  }

  /**
   * Returns whether a component as the specified secondary identifier attribute.
   *
   * @param name The name of the secondary identifier attribute to check.
   *
   * @returns A boolean.
   */
  hasSecondaryIdentifierAttribute(name: string) {
    return this.__getSecondaryIdentifierAttribute(name, {autoFork: false}) !== undefined;
  }

  __getSecondaryIdentifierAttribute(name: string, options: {autoFork: boolean}) {
    const {autoFork} = options;

    const property = this.__getProperty(name, {autoFork});

    if (property === undefined) {
      return undefined;
    }

    if (!isSecondaryIdentifierAttributeInstance(property)) {
      throw new Error(
        `A property with the specified name was found, but it is not a secondary identifier attribute (${property.describe()})`
      );
    }

    return property;
  }

  /**
   * Defines a secondary identifier attribute in a component. Typically, instead of using this method, you would rather use the `@secondaryIdentifier()` decorator.
   *
   * @param name The name of the secondary identifier attribute to define.
   * @param attributeOptions The options to be passed to the `SecondaryIdentifierAttribute` constructor.
   *
   * @returns The `SecondaryIdentifierAttribute` that was created.
   */

  setSecondaryIdentifierAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, SecondaryIdentifierAttribute, attributeOptions);
  }

  /**
   * Returns an iterator providing the identifier attributes of a component.
   *
   * @param options.filter A function used to filter the identifier attributes to be returned. The function is invoked for each identifier attribute with an `IdentifierAttribute` instance as first argument.
   * @param options.setAttributesOnly A boolean specifying whether only set identifier attributes should be returned (default: `false`).
   * @param options.attributeSelector An `AttributeSelector` specifying the identifier attributes to be returned (default: `true` which means that all identifier attributes should be returned).
   *
   * @returns An `IdentifierAttribute` instance iterator.
   */
  getIdentifierAttributes(
    options: {
      filter?: PropertyFilterSync;
      autoFork?: boolean;
    } & CreatePropertyFilterOptionsForAttributes = {}
  ) {
    const {
      filter: originalFilter,
      attributeSelector = true,
      setAttributesOnly = false,
      autoFork = true
    } = options;

    const filter = function (this: Component, property: Property) {
      if (!isIdentifierAttributeInstance(property)) {
        return false;
      }

      if (originalFilter !== undefined) {
        return originalFilter.call(this, property);
      }

      return true;
    };

    return this.getProperties<IdentifierAttribute>({
      filter,
      autoFork,
      attributeSelector,
      setAttributesOnly
    });
  }

  /**
   * Returns an iterator providing the secondary identifier attributes of a component.
   *
   * @param options.filter A function used to filter the secondary identifier attributes to be returned. The function is invoked for each identifier attribute with a `SecondaryIdentifierAttribute` instance as first argument.
   * @param options.setAttributesOnly A boolean specifying whether only set secondary identifier attributes should be returned (default: `false`).
   * @param options.attributeSelector An `AttributeSelector` specifying the secondary identifier attributes to be returned (default: `true` which means that all secondary identifier attributes should be returned).
   *
   * @returns A `SecondaryIdentifierAttribute` instance iterator.
   */
  getSecondaryIdentifierAttributes(
    options: {
      filter?: PropertyFilterSync;
      autoFork?: boolean;
    } & CreatePropertyFilterOptionsForAttributes = {}
  ) {
    const {
      filter: originalFilter,
      attributeSelector = true,
      setAttributesOnly = false,
      autoFork = true
    } = options;

    const filter = function (this: Component, property: Property) {
      if (!isSecondaryIdentifierAttributeInstance(property)) {
        return false;
      }

      if (originalFilter !== undefined) {
        return originalFilter.call(this, property);
      }

      return true;
    };

    return this.getProperties<SecondaryIdentifierAttribute>({
      filter,
      autoFork,
      attributeSelector,
      setAttributesOnly
    });
  }

  /**
   * Returns an object composed of all the set identifiers of a component. The shape of the returned object is `{[identifierName]: identifierValue}`. If the component doesn't have any set identifiers, returns `undefined`.
   *
   * @returns An object composed of all the set identifiers of a component.
   */
  getIdentifiers() {
    const identifiers = this.__getIdentifiers();

    if (identifiers === undefined) {
      throw new Error(
        `Cannot get the identifiers of a component that has no set identifier (${this.describeComponent()})`
      );
    }

    return identifiers;
  }

  /**
   * Returns whether a component has a set identifier or not.
   *
   * @returns A boolean.
   */
  hasIdentifiers() {
    return this.__getIdentifiers() !== undefined;
  }

  __getIdentifiers() {
    let identifiers: IdentifierObject | undefined;

    for (const identifierAttribute of this.getIdentifierAttributes({
      setAttributesOnly: true,
      autoFork: false
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue() as IdentifierValue;

      if (identifiers === undefined) {
        identifiers = {};
      }

      identifiers[name] = value;
    }

    return identifiers;
  }

  /**
   * Generates a unique identifier using the [cuid](https://github.com/ericelliott/cuid) library.
   *
   * @returns The generated identifier.
   */
  static generateId() {
    return cuid();
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
    return this.hasPrimaryIdentifierAttribute() ? 1 : 0;
  }

  // === Identifier descriptor ===

  /**
   * Returns the `IdentifierDescriptor` of a component.
   *
   * An `IdentifierDescriptor` is a plain object composed of one pair of name/value corresponding to the name and value of the first identifier attribute encountered in a component. Usually it is the primary identifier, but if the latter is not set, it can be a secondary identifier.
   *
   * If there is no set identifier in the component, an error is thrown.
   *
   * @returns A plain object representing the `IdentifierDescriptor` of a component.
   */
  getIdentifierDescriptor() {
    const identifierDescriptor = this.__getIdentifierDescriptor();

    if (identifierDescriptor === undefined) {
      throw new Error(
        `Cannot get an identifier descriptor from a component that has no set identifier (${this.describeComponent()})`
      );
    }

    return identifierDescriptor;
  }

  /**
   * Returns whether a component can provide an `IdentifierDescriptor` (using the `getIdentifierDescriptor()` method) or not.
   *
   * @returns A boolean.
   */
  hasIdentifierDescriptor() {
    return this.__getIdentifierDescriptor() !== undefined;
  }

  __getIdentifierDescriptor(): NormalizedIdentifierDescriptor | undefined {
    const primaryIdentifierAttribute = this.getPrimaryIdentifierAttribute();

    if (primaryIdentifierAttribute.isSet()) {
      const name = primaryIdentifierAttribute.getName();
      const value = primaryIdentifierAttribute.getValue() as IdentifierValue;

      return {[name]: value};
    }

    for (const secondaryIdentifierAttribute of this.getSecondaryIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = secondaryIdentifierAttribute.getName();
      const value = secondaryIdentifierAttribute.getValue() as IdentifierValue;

      return {[name]: value};
    }

    return undefined;
  }

  static normalizeIdentifierDescriptor(
    identifierDescriptor: IdentifierDescriptor
  ): NormalizedIdentifierDescriptor {
    if (typeof identifierDescriptor === 'string' || typeof identifierDescriptor === 'number') {
      const primaryIdentifierAttribute = this.prototype.getPrimaryIdentifierAttribute();
      const name = primaryIdentifierAttribute.getName();
      primaryIdentifierAttribute.checkValue(identifierDescriptor);

      return {[name]: identifierDescriptor};
    }

    if (!isPlainObject(identifierDescriptor)) {
      throw new Error(
        `An identifier descriptor should be a string, a number, or an object, but received a value of type '${getTypeOf(
          identifierDescriptor
        )}' (${this.describeComponent()})`
      );
    }

    const attributes = Object.entries(identifierDescriptor);

    if (attributes.length !== 1) {
      throw new Error(
        `An identifier descriptor should be a string, a number, or an object composed of one attribute, but received an object composed of ${
          attributes.length
        } attributes (${this.describeComponent()}, received object: ${JSON.stringify(
          identifierDescriptor
        )})`
      );
    }

    const [name, value] = attributes[0];
    const identifierAttribute = this.prototype.getIdentifierAttribute(name);
    identifierAttribute.checkValue(value);

    return {[name]: value};
  }

  static describeIdentifierDescriptor(identifierDescriptor: IdentifierDescriptor) {
    const normalizedIdentifierDescriptor = this.normalizeIdentifierDescriptor(identifierDescriptor);
    const [[name, value]] = Object.entries(normalizedIdentifierDescriptor);
    const valueString = typeof value === 'string' ? `'${value}'` : value.toString();

    return `${name}: ${valueString}`;
  }

  // === Identity map ===

  static __identityMap: IdentityMap;

  /**
   * Gets the `IdentityMap` of a component.
   *
   * @returns An `IdentityMap` instance.
   */
  static getIdentityMap() {
    if (this.__identityMap === undefined) {
      Object.defineProperty(this, '__identityMap', {value: new IdentityMap(this)});
    } else if (!hasOwnProperty(this, '__identityMap')) {
      Object.defineProperty(this, '__identityMap', {value: this.__identityMap.fork(this)});
    }

    return this.__identityMap;
  }

  // === Attribute selectors ===

  static get resolveAttributeSelector() {
    return this.prototype.resolveAttributeSelector;
  }

  resolveAttributeSelector(
    attributeSelector: AttributeSelector,
    options: ResolveAttributeSelectorOptions = {}
  ) {
    attributeSelector = normalizeAttributeSelector(attributeSelector);

    const {
      filter,
      setAttributesOnly = false,
      target,
      aggregationMode = 'union',
      includeReferencedComponents = false,
      alwaysIncludePrimaryIdentifierAttributes = true,
      allowPartialArrayItems = true,
      depth = Number.MAX_SAFE_INTEGER,
      _isDeep = false,
      _isArrayItem = false,
      _attributeStack = new Set()
    } = options;

    const _skipUnchangedAttributes =
      setAttributesOnly &&
      target !== undefined &&
      (target === -1 || typeof (this as any).isStorable === 'function');

    return this.__resolveAttributeSelector(attributeSelector, {
      filter,
      setAttributesOnly,
      target,
      aggregationMode,
      includeReferencedComponents,
      alwaysIncludePrimaryIdentifierAttributes,
      allowPartialArrayItems,
      depth,
      _isDeep,
      _skipUnchangedAttributes,
      _isArrayItem,
      _attributeStack
    });
  }

  static get __resolveAttributeSelector() {
    return this.prototype.__resolveAttributeSelector;
  }

  __resolveAttributeSelector(
    attributeSelector: AttributeSelector,
    options: ResolveAttributeSelectorOptions
  ) {
    const {
      filter,
      setAttributesOnly,
      target,
      includeReferencedComponents,
      alwaysIncludePrimaryIdentifierAttributes,
      allowPartialArrayItems,
      depth,
      _isDeep,
      _skipUnchangedAttributes,
      _isArrayItem,
      _attributeStack
    } = options;

    if (depth! < 0) {
      return attributeSelector;
    }

    const newDepth = depth! - 1;

    let resolvedAttributeSelector: AttributeSelector = {};

    if (attributeSelector === false) {
      return resolvedAttributeSelector; // Optimization
    }

    const isEmbedded = isComponentInstance(this) && this.constructor.isEmbedded();

    if (!setAttributesOnly && isEmbedded && _isArrayItem && !allowPartialArrayItems) {
      attributeSelector = true;
    }

    // By default, referenced components are not resolved
    if (!_isDeep || includeReferencedComponents || isEmbedded) {
      for (const attribute of this.getAttributes({filter, setAttributesOnly})) {
        const name = attribute.getName();

        const subattributeSelector = getFromAttributeSelector(attributeSelector, name);

        if (subattributeSelector === false) {
          continue;
        }

        if (_skipUnchangedAttributes && attribute.getValueSource() === target) {
          continue;
        }

        if (_attributeStack!.has(attribute)) {
          continue; // Avoid looping indefinitely when a circular attribute is encountered
        }

        _attributeStack!.add(attribute);

        const resolvedSubattributeSelector = attribute._resolveAttributeSelector(
          subattributeSelector,
          {...options, depth: newDepth, _isDeep: true}
        );

        _attributeStack!.delete(attribute);

        if (resolvedSubattributeSelector !== false) {
          resolvedAttributeSelector = setWithinAttributeSelector(
            resolvedAttributeSelector,
            name,
            resolvedSubattributeSelector
          );
        }
      }
    }

    if (
      isComponentInstance(this) &&
      alwaysIncludePrimaryIdentifierAttributes &&
      this.hasPrimaryIdentifierAttribute()
    ) {
      const primaryIdentifierAttribute = this.getPrimaryIdentifierAttribute();

      const isNotFilteredOut =
        filter !== undefined ? filter.call(this, primaryIdentifierAttribute) : true;

      if (isNotFilteredOut && (!setAttributesOnly || primaryIdentifierAttribute.isSet())) {
        resolvedAttributeSelector = setWithinAttributeSelector(
          resolvedAttributeSelector,
          primaryIdentifierAttribute.getName(),
          true
        );
      }
    }

    return resolvedAttributeSelector;
  }

  // === Validation ===

  /**
   * Validates the attributes of a component. If an attribute doesn't pass the validation, an error is thrown. The error is a JS `Error` instance with a `failedValidators` custom attribute which contains the result of the `runValidators()` method.
   *
   * @param attributeSelector An `AttributeSelector` specifying the attributes to be validated (default: `true` which means that all the attributes will be validated).
   */
  static get validate() {
    return this.prototype.validate;
  }

  /**
   * Validates the attributes of a component. If an attribute doesn't pass the validation, an error is thrown. The error is a JS `Error` instance with a `failedValidators` custom attribute which contains the result of the `runValidators()` method.
   *
   * @param attributeSelector An `AttributeSelector` specifying the attributes to be validated (default: `true` which means that all the attributes will be validated).
   */
  validate(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    const error = Object.assign(
      new Error(
        `The following error(s) occurred while validating the component '${ensureComponentClass(
          this
        ).getComponentName()}': ${details}`
      ),
      {failedValidators}
    );

    throw error;
  }

  /**
   * Returns whether the attributes of the component are valid.
   *
   * @param attributeSelector An `AttributeSelector` specifying the attributes to be checked (default: `true` which means that all the attributes will be checked).
   *
   * @returns A boolean.
   */
  static get isValid() {
    return this.prototype.isValid;
  }

  /**
   * Returns whether the attributes of the component are valid.
   *
   * @param attributeSelector An `AttributeSelector` specifying the attributes to be checked (default: `true` which means that all the attributes will be checked).
   *
   * @returns A boolean.
   */
  isValid(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  /**
   * Runs the validators for all the set attributes of a component.
   *
   * @param attributeSelector An `AttributeSelector` specifying the attributes to be validated (default: `true` which means that all the attributes will be validated).
   *
   * @returns An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a `Validator` instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).
   */
  static get runValidators() {
    return this.prototype.runValidators;
  }

  /**
   * Runs the validators for all the set attributes of a component.
   *
   * @param attributeSelector An `AttributeSelector` specifying the attributes to be validated (default: `true` which means that all the attributes will be validated).
   *
   * @returns An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a `Validator` instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).
   */
  runValidators(attributeSelector: AttributeSelector = true) {
    attributeSelector = this.resolveAttributeSelector(attributeSelector);

    const failedValidators = [];

    for (const attribute of this.getAttributes({setAttributesOnly: true})) {
      const name = attribute.getName();

      const subattributeSelector = getFromAttributeSelector(attributeSelector, name);

      if (subattributeSelector === false) {
        continue;
      }

      const attributeFailedValidators = attribute.runValidators(subattributeSelector);

      for (const {validator, path} of attributeFailedValidators) {
        failedValidators.push({validator, path: joinAttributePath([name, path])});
      }
    }

    return failedValidators;
  }

  // === Methods ===

  /**
   * Gets a method of a component.
   *
   * @param name The name of the method to get.
   *
   * @returns A `Method` instance.
   */
  static get getMethod() {
    return this.prototype.getMethod;
  }

  /**
   * Gets a method of a component.
   *
   * @param name The name of the method to get.
   *
   * @returns A `Method` instance.
   */
  getMethod(name: string, options: {autoFork?: boolean} = {}) {
    const {autoFork = true} = options;

    const method = this.__getMethod(name, {autoFork});

    if (method === undefined) {
      throw new Error(`The method '${name}' is missing (${this.describeComponent()})`);
    }

    return method;
  }

  /**
   * Returns whether a component as the specified method.
   *
   * @param name The name of the method to check.
   *
   * @returns A boolean.
   */
  static get hasMethod() {
    return this.prototype.hasMethod;
  }

  /**
   * Returns whether a component as the specified method.
   *
   * @param name The name of the method to check.
   *
   * @returns A boolean.
   */
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

  /**
   * Defines a method in a component. Typically, instead of using this method, you would rather use the `@method()` decorator.
   *
   * @param name The name of the method to define.
   * @param methodOptions The options to be passed to the `Method` constructor.
   *
   * @returns The `Method` that was created.
   */
  static get setMethod() {
    return this.prototype.setMethod;
  }

  /**
   * Defines a method in a component. Typically, instead of using this method, you would rather use the `@method()` decorator.
   *
   * @param name The name of the method to define.
   * @param methodOptions The options to be passed to the `Method` constructor.
   *
   * @returns The `Method` that was created.
   */
  setMethod(name: string, methodOptions: MethodOptions = {}) {
    return this.setProperty(name, Method, methodOptions);
  }

  /**
   * Returns an iterator providing the methods of a component.
   *
   * @param options.filter A function used to filter the methods to be returned. The function is invoked for each method with a `Method` instance as first argument.
   *
   * @returns A `Method` instance iterator.
   */
  static get getMethods() {
    return this.prototype.getMethods;
  }

  /**
   * Returns an iterator providing the methods of a component.
   *
   * @param options.filter A function used to filter the methods to be returned. The function is invoked for each method with a `Method` instance as first argument.
   *
   * @returns A `Method` instance iterator.
   */
  getMethods(options: {filter?: PropertyFilterSync; autoFork?: boolean} = {}) {
    const {filter, autoFork = true} = options;

    return this.getProperties<Method>({filter, autoFork, methodsOnly: true});
  }

  // === Dependency management ===

  // --- Component getters ---

  /**
   * Gets a component class that is provided or consumed by the current component. An error is thrown if there is no component matching the specified name. If the specified name is the name of the current component, the latter is returned.
   *
   * @param name The name of the component class to get.
   *
   * @returns A component class.
   */
  static getComponent(name: string) {
    const component = this.__getComponent(name);

    if (component === undefined) {
      throw new Error(
        `Cannot get the component '${name}' from the component '${this.getComponentPath()}'`
      );
    }

    return component;
  }

  /**
   * Returns whether the current component provides or consumes another component.
   *
   * @param name The name of the component class to check.
   *
   * @returns A boolean.
   */
  static hasComponent(name: string) {
    return this.__getComponent(name) !== undefined;
  }

  static __getComponent(name: string): typeof Component | undefined {
    assertIsComponentName(name);

    if (this.getComponentName() === name) {
      return this;
    }

    let providedComponent = this.getProvidedComponent(name);

    if (providedComponent !== undefined) {
      return providedComponent;
    }

    const componentProvider = this.__getComponentProvider();

    if (componentProvider !== undefined) {
      return componentProvider.__getComponent(name);
    }

    return undefined;
  }

  /**
   * Gets a component class or prototype of the specified type that is provided or consumed by the current component. An error is thrown if there is no component matching the specified type. If the specified type is the type of the current component, the latter is returned.
   *
   * @param type The type of the component class or prototype to get.
   *
   * @returns A component class or prototype.
   */
  static getComponentOfType(type: string) {
    const component = this.__getComponentOfType(type);

    if (component === undefined) {
      throw new Error(
        `Cannot get the component of type '${type}' from the component '${this.getComponentPath()}'`
      );
    }

    return component;
  }

  /**
   * Returns whether the current component provides or consumes a component class or prototype matching the specified type.
   *
   * @param type The type of the component class or prototype to check.
   *
   * @returns A boolean.
   */
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

  // --- Component provision ---

  /**
   * Gets a component that is provided by the current component. An error is thrown if there is no provided component with the specified name.
   *
   * @param name The name of the provided component to get.
   *
   * @returns A component class.
   */
  static getProvidedComponent(name: string) {
    assertIsComponentName(name);

    const providedComponents = this.__getProvidedComponents();

    let providedComponent = providedComponents[name];

    if (providedComponent === undefined) {
      return undefined;
    }

    if (!hasOwnProperty(providedComponents, name)) {
      // Since the host component has been forked, the provided component must be forked as well
      providedComponent = providedComponent.fork({componentProvider: this});
      providedComponents[name] = providedComponent;
    }

    return providedComponent;
  }

  /**
   * Specifies that the current component is providing another component so it can be easily accessed from the current component or from any component that is "consuming" it using the `consumeComponent()` method or the `@consume()` decorator.
   *
   * The provided component can later be accessed using a component accessor that was automatically set on the component provider.
   *
   * Typically, instead of using this method, you would rather use the `@provide()` decorator.
   *
   * @param component The component class to provide.
   *
   * @example
   * class Backend extends Component {}
   * class Movie extends Component {}
   * Backend.provideComponent(Movie);
   *
   * Backend.Movie; // => `Movie` class
   */
  static provideComponent(component: typeof Component) {
    assertIsComponentClass(component);

    const providedComponents = this.__getProvidedComponents();

    const existingProvider = component.__getComponentProvider();

    if (existingProvider !== undefined) {
      if (existingProvider === this) {
        return;
      }

      throw new Error(
        `Cannot provide the component '${component.getComponentName()}' from '${this.getComponentName()}' because '${component.getComponentName()}' is already provided by '${existingProvider.getComponentName()}'`
      );
    }

    const componentName = component.getComponentName();

    const existingComponent = providedComponents[componentName];

    if (existingComponent !== undefined && !component.isForkOf(existingComponent)) {
      throw new Error(
        `Cannot provide the component '${component.getComponentName()}' from '${this.getComponentName()}' because a component with the same name is already provided`
      );
    }

    if (componentName in this) {
      const descriptor = Object.getOwnPropertyDescriptor(this, componentName);
      const value = descriptor?.value;

      if (!(isComponentClass(value) && (value === component || value.isForkOf(component)))) {
        throw new Error(
          `Cannot provide the component '${component.getComponentName()}' from '${this.getComponentName()}' because there is an existing property with the same name`
        );
      }
    }

    component.__setComponentProvider(this);
    providedComponents[componentName] = component;

    Object.defineProperty(this, componentName, {
      get<T extends typeof Component>(this: T) {
        return this.getProvidedComponent(componentName);
      },
      set<T extends typeof Component>(this: T, component: typeof Component) {
        // Set the value temporarily so @provide() can get it
        Object.defineProperty(this, componentName, {
          value: component,
          configurable: true,
          enumerable: true,
          writable: true
        });
      }
    });
  }

  /**
   * Returns an iterator allowing to iterate over the components provided by the current component.
   *
   * @param options.filter A function used to filter the provided components to be returned. The function is invoked for each provided component with the provided component as first argument.
   * @param options.deep A boolean specifying whether the method should get the provided components recursively (i.e., get the provided components of the provided components). Default: `false`.
   *
   * @returns A provided component iterator.
   */
  static getProvidedComponents(
    options: {deep?: boolean; filter?: (providedComponent: typeof Component) => boolean} = {}
  ) {
    const {deep = false, filter} = options;

    const component = this;

    return {
      *[Symbol.iterator](): Generator<typeof Component> {
        for (const name in component.__getProvidedComponents()) {
          const providedComponent = component.getProvidedComponent(name)!;

          if (filter !== undefined && !filter(providedComponent)) {
            continue;
          }

          yield providedComponent;

          if (deep) {
            for (const nestedProvidedComponent of providedComponent.getProvidedComponents({
              deep,
              filter
            })) {
              yield nestedProvidedComponent;
            }
          }
        }
      }
    };
  }

  /**
   * Returns the provider of a component. If a component has no component provider, returns the current component.
   *
   * @returns A component provider.
   *
   * @example
   * class Backend extends Component {}
   * class Movie extends Component {}
   * Backend.provideComponent(Movie);
   *
   * Movie.getComponentProvider(); // => `Backend` class
   * Backend.getComponentProvider(); // => `Backend` class
   */
  static getComponentProvider() {
    const componentName = this.getComponentName();

    let currentComponent = this;

    while (true) {
      const componentProvider = currentComponent.__getComponentProvider();

      if (componentProvider === undefined) {
        return currentComponent;
      }

      const providedComponent = componentProvider.getProvidedComponent(componentName);

      if (providedComponent !== undefined) {
        return componentProvider;
      }

      currentComponent = componentProvider;
    }
  }

  static __componentProvider?: typeof Component;

  static __getComponentProvider() {
    return hasOwnProperty(this, '__componentProvider') ? this.__componentProvider : undefined;
  }

  static __setComponentProvider(componentProvider: typeof Component) {
    Object.defineProperty(this, '__componentProvider', {value: componentProvider});
  }

  static __providedComponents: {[name: string]: typeof Component};

  static __getProvidedComponents() {
    if (this.__providedComponents === undefined) {
      Object.defineProperty(this, '__providedComponents', {
        value: Object.create(null)
      });
    } else if (!hasOwnProperty(this, '__providedComponents')) {
      Object.defineProperty(this, '__providedComponents', {
        value: Object.create(this.__providedComponents)
      });
    }

    return this.__providedComponents;
  }

  // --- Component consumption ---

  /**
   * Gets a component that is consumed by the current component. An error is thrown if there is no consumed component with the specified name.
   *
   * @param name The name of the consumed component to get.
   *
   * @returns A component class.
   */
  static getConsumedComponent(name: string) {
    assertIsComponentName(name);

    const consumedComponents = this.__getConsumedComponents();

    if (!consumedComponents.has(name)) {
      return undefined;
    }

    const componentProvider = this.__getComponentProvider();

    if (componentProvider === undefined) {
      return undefined;
    }

    return componentProvider.__getComponent(name);
  }

  /**
   * Specifies that the current component is consuming another component so it can be easily accessed using a component accessor.
   *
   * Typically, instead of using this method, you would rather use the `@consume()` decorator.
   *
   * @param name The name of the component to consume.
   *
   * @example
   * class Backend extends Component {}
   * class Movie extends Component {}
   * Backend.provideComponent(Movie);
   * Movie.consumeComponent('Backend');
   *
   * Movie.Backend; // => `Backend` class
   */
  static consumeComponent(name: string) {
    assertIsComponentName(name);

    const consumedComponents = this.__getConsumedComponents(true);

    if (consumedComponents.has(name)) {
      return;
    }

    if (name in this) {
      throw new Error(
        `Cannot consume the component '${name}' from '${this.getComponentName()}' because there is an existing property with the same name`
      );
    }

    consumedComponents.add(name);

    Object.defineProperty(this, name, {
      get<T extends typeof Component>(this: T) {
        return this.getConsumedComponent(name);
      },
      set<T extends typeof Component>(this: T, _value: never) {
        // A component consumer should not be set directly
      }
    });
  }

  /**
   * Returns an iterator allowing to iterate over the components consumed by the current component.
   *
   * @param options.filter A function used to filter the consumed components to be returned. The function is invoked for each consumed component with the consumed component as first argument.
   *
   * @returns A consumed component iterator.
   */
  static getConsumedComponents(
    options: {filter?: (consumedComponent: typeof Component) => boolean} = {}
  ) {
    const {filter} = options;

    const component = this;

    return {
      *[Symbol.iterator]() {
        for (const name of component.__getConsumedComponents()) {
          const consumedComponent = component.getConsumedComponent(name)!;

          if (filter !== undefined && !filter(consumedComponent)) {
            continue;
          }

          yield consumedComponent;
        }
      }
    };
  }

  static __consumedComponents: Set<string>;

  static __getConsumedComponents(autoFork = false) {
    if (this.__consumedComponents === undefined) {
      Object.defineProperty(this, '__consumedComponents', {
        value: new Set()
      });
    } else if (autoFork && !hasOwnProperty(this, '__consumedComponents')) {
      Object.defineProperty(this, '__consumedComponents', {
        value: new Set(this.__consumedComponents)
      });
    }

    return this.__consumedComponents;
  }

  // === Cloning ===

  static clone() {
    return this;
  }

  /**
   * Clones a component instance. A new componentAll primitive attributes are copied, and embedded components are cloned recursively. Currently, identifiable components (i.e., components having an identifier attribute) cannot be cloned, but this might change in the future.
   *
   * @returns A clone of the component.
   */
  clone<
    T extends Component,
    R = ReturnType<T['initialize']> extends PromiseLike<void> ? PromiseLike<T> : T
  >(this: T, options?: CloneOptions): R;
  clone(options: CloneOptions = {}) {
    if (this.hasPrimaryIdentifierAttribute()) {
      return this;
    }

    const clonedComponent = this.constructor.create(
      {},
      {
        isNew: this.getIsNewMark(),
        source: this.getIsNewMarkSource(),
        attributeSelector: {},
        initialize: false
      }
    );

    for (const attribute of this.getAttributes({setAttributesOnly: true})) {
      const name = attribute.getName();
      const value = attribute.getValue();
      const source = attribute.getValueSource();
      const clonedValue = clone(value, options);
      clonedComponent.getAttribute(name).setValue(clonedValue, {source});
    }

    return possiblyAsync(clonedComponent.initialize(), () => clonedComponent);
  }

  // === Forking ===

  /**
   * Creates a fork of the current component class.
   *
   * @returns The component class fork.
   *
   * @example
   * class Movie extends Component {}
   *
   * Movie.fork() // => A fork of the `Movie` class
   */
  static fork<T extends typeof Component>(this: T, options: ForkOptions = {}): T {
    const {componentProvider = this.__getComponentProvider()} = options;

    const name = this.getComponentName();

    // Use a little trick to make sure the generated subclass
    // has the 'name' attribute set properly
    // @ts-ignore
    const {[name]: forkedComponent} = {[name]: class extends this {}};

    if (componentProvider !== undefined) {
      forkedComponent.__setComponentProvider(componentProvider);
    }

    return forkedComponent;
  }

  /**
   * Creates a fork of the current component instance. Note that the constructor of the resulting component will be a fork of the current component class.
   *
   * @returns The component instance fork.
   *
   * @example
   * class Movie extends Component {}
   * const movie = new Movie();
   *
   * movie.fork() // => A fork of `movie`
   * movie.fork().constructor.isForkOf(Movie) // => true
   */
  fork<T extends Component>(this: T, options: ForkOptions = {}) {
    let {componentClass} = options;

    if (componentClass === undefined) {
      componentClass = this.constructor.fork();
    } else {
      assertIsComponentClass(componentClass);
    }

    const forkedComponent = Object.create(this) as T;

    if (this.constructor !== componentClass) {
      // Make 'forkedComponent' believe that it is an instance of 'Component'
      // It can happen when a referenced component is forked
      Object.defineProperty(forkedComponent, 'constructor', {
        value: componentClass,
        writable: true,
        enumerable: false,
        configurable: true
      });

      if (forkedComponent.hasPrimaryIdentifierAttribute() && forkedComponent.isAttached()) {
        componentClass.getIdentityMap().addComponent(forkedComponent);
      }
    }

    return forkedComponent;
  }

  /**
   * Returns whether the current component class is a fork of another component class.
   *
   * @returns A boolean.
   */
  static isForkOf(component: typeof Component) {
    assertIsComponentClass(component);

    return isPrototypeOf(component, this);
  }

  /**
   * Returns whether the current component instance is a fork of another component instance.
   *
   * @returns A boolean.
   */
  isForkOf(component: Component) {
    assertIsComponentInstance(component);

    return isPrototypeOf(component, this);
  }

  static [Symbol.hasInstance](instance: any) {
    // Since fork() can change the constructor of the forked instances,
    // we must change the behavior of 'instanceof' so it can work as expected
    return instance.constructor === this || isPrototypeOf(this, instance.constructor);
  }

  static __ghost: typeof Component;

  /**
   * Gets the ghost of the current component class. A ghost is like a fork, but it is unique. The first time you call this method, a fork is created, and then, all the successive calls return the same fork.
   *
   * @returns The ghost of the current component class.
   *
   * @example
   * class Movie extends Component {}
   *
   * Movie.getGhost() // => A fork of the `Movie` class
   * Movie.getGhost() // => The same fork of the `Movie` class
   */
  static getGhost<T extends typeof Component>(this: T) {
    let ghost = this.__ghost;

    if (ghost === undefined) {
      const componentProvider = this.getComponentProvider();

      if (componentProvider === this) {
        ghost = this.fork();
      } else {
        ghost = componentProvider.getGhost().getComponent(this.getComponentName());
      }

      Object.defineProperty(this, '__ghost', {value: ghost});
    }

    return ghost as T;
  }

  /**
   * Gets the ghost of the current component instance. A ghost is like a fork, but it is unique. The first time you call this method, a fork is created, and then, all the successive calls return the same fork. Only identifiable components (i.e., components having an identifier attribute) can be "ghosted".
   *
   * @returns The ghost of the current component instance.
   *
   * @example
   * class Movie extends Component {
   *   ﹫primaryIdentifier() id;
   * }
   *
   * const movie = new Movie();
   *
   * movie.getGhost() // => A fork of `movie`
   * movie.getGhost() // => The same fork of `movie`
   */
  getGhost<T extends Component>(this: T): T {
    const identifiers = this.getIdentifiers();
    const ghostClass = this.constructor.getGhost();
    const ghostIdentityMap = ghostClass.getIdentityMap();
    let ghostComponent = ghostIdentityMap.getComponent(identifiers);

    if (ghostComponent === undefined) {
      ghostComponent = this.fork({componentClass: ghostClass});
      ghostIdentityMap.addComponent(ghostComponent);
    }

    return ghostComponent as T;
  }

  // === Merging ===

  /**
   * Merges the attributes of a component class fork into the current component class.
   *
   * @param forkedComponent The component class fork to merge.
   *
   * @returns The current component class.
   */
  static merge<T extends typeof Component>(
    this: T,
    forkedComponent: typeof Component,
    options: MergeOptions = {}
  ) {
    assertIsComponentClass(forkedComponent);

    if (!isPrototypeOf(this, forkedComponent)) {
      throw new Error('Cannot merge a component that is not a fork of the target component');
    }

    this.__mergeAttributes(forkedComponent, options);

    return this;
  }

  /**
   * Merges the attributes of a component instance fork into the current component instance.
   *
   * @param forkedComponent The component instance fork to merge.
   *
   * @returns The current component instance.
   */
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

      attribute.setValue(mergedValue, {source: forkedAttribute.getValueSource()});
    }
  }

  // === Attachment ===

  static __isAttached: boolean;

  /**
   * Attaches the current component class to its `IdentityMap`. By default, all component classes are attached, so unless you have detached a component class earlier, you should not have to use this method.
   *
   * @returns The current component class.
   */
  static attach<T extends typeof Component>(this: T) {
    Object.defineProperty(this, '__isAttached', {value: true, configurable: true});

    return this;
  }

  /**
   * Detaches the current component class from its `IdentityMap`.
   *
   * @returns The current component class.
   */
  static detach<T extends typeof Component>(this: T) {
    Object.defineProperty(this, '__isAttached', {value: false, configurable: true});

    return this;
  }

  /**
   * Returns whether the current component class is attached to its `IdentityMap`.
   *
   * @returns A boolean.
   */
  static isAttached() {
    let currentComponent = this;

    while (true) {
      const isAttached = currentComponent.__isAttached;

      if (isAttached !== undefined) {
        return isAttached;
      }

      const componentProvider = currentComponent.getComponentProvider();

      if (componentProvider === currentComponent) {
        return true;
      }

      currentComponent = componentProvider;
    }
  }

  /**
   * Returns whether the current component class is detached from its `IdentityMap`.
   *
   * @returns A boolean.
   */
  static isDetached() {
    return !this.isAttached();
  }

  __isAttached?: boolean;

  /**
   * Attaches the current component instance to its `IdentityMap`. By default, all component instances are attached, so unless you have detached a component instance earlier, you should not have to use this method.
   *
   * @returns The current component instance.
   */
  attach() {
    Object.defineProperty(this, '__isAttached', {value: true, configurable: true});

    if (this.hasPrimaryIdentifierAttribute()) {
      const identityMap = this.constructor.getIdentityMap();
      identityMap.addComponent(this);
    }

    return this;
  }

  /**
   * Detaches the current component instance from its `IdentityMap`.
   *
   * @returns The current component instance.
   */
  detach() {
    if (this.hasPrimaryIdentifierAttribute()) {
      const identityMap = this.constructor.getIdentityMap();
      identityMap.removeComponent(this);
    }

    Object.defineProperty(this, '__isAttached', {value: false, configurable: true});

    return this;
  }

  /**
   * Returns whether the current component instance is attached to its `IdentityMap`.
   *
   * @returns A boolean.
   */
  isAttached() {
    if (this.__isAttached !== undefined) {
      return this.__isAttached;
    }

    return this.constructor.isAttached();
  }

  /**
   * Returns whether the current component instance is detached from its `IdentityMap`.
   *
   * @returns A boolean.
   */
  isDetached() {
    return !this.isAttached();
  }

  // === Serialization ===

  /**
   * Serializes the current component class to a plain object.
   *
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be serialized (default: `true` which means that all the attributes will be serialized).
   * @param options.attributeFilter A (possibly async) function used to filter the attributes to be serialized. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param target The target of the serialization (default: `undefined`).
   *
   * @returns A plain object representing the serialized component class.
   */
  static serialize(options: SerializeOptions = {}) {
    const {
      attributeSelector = true,
      serializedComponents = new Set(),
      returnComponentReferences = false,
      ignoreEmptyComponents = false,
      includeComponentTypes = true,
      includeReferencedComponents = false,
      target,
      ...otherOptions
    } = options;

    const resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
      setAttributesOnly: true,
      target,
      aggregationMode: 'intersection',
      includeReferencedComponents
    });

    return this.__serialize({
      ...otherOptions,
      attributeSelector: resolvedAttributeSelector,
      serializedComponents,
      returnComponentReferences,
      ignoreEmptyComponents,
      includeComponentTypes,
      includeReferencedComponents,
      target
    });
  }

  static __serialize(options: SerializeOptions) {
    const {
      serializedComponents,
      componentDependencies,
      returnComponentReferences,
      ignoreEmptyComponents,
      includeComponentTypes,
      includeReferencedComponents
    } = options;

    const serializedComponent: PlainObject = {};

    if (includeComponentTypes) {
      serializedComponent.__component = this.getComponentType();
    }

    const hasAlreadyBeenSerialized = serializedComponents!.has(this);

    if (!hasAlreadyBeenSerialized) {
      serializedComponents!.add(this);

      if (componentDependencies !== undefined) {
        for (const providedComponent of this.getProvidedComponents()) {
          componentDependencies.add(providedComponent);
        }

        for (const consumedComponent of this.getConsumedComponents()) {
          componentDependencies.add(consumedComponent);
        }
      }
    }

    if (hasAlreadyBeenSerialized || (returnComponentReferences && !includeReferencedComponents)) {
      return serializedComponent;
    }

    return possiblyAsync(
      this.__serializeAttributes(serializedComponent, options),
      (attributeCount) =>
        ignoreEmptyComponents && attributeCount === 0 ? undefined : serializedComponent
    );
  }

  /**
   * Serializes the current component instance to a plain object.
   *
   * @param options.attributeSelector An `AttributeSelector` specifying the attributes to be serialized (default: `true` which means that all the attributes will be serialized).
   * @param options.attributeFilter A (possibly async) function used to filter the attributes to be serialized. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param target The target of the serialization (default: `undefined`).
   *
   * @returns A plain object representing the serialized component instance.
   */
  serialize(options: SerializeOptions = {}) {
    const {
      attributeSelector = true,
      serializedComponents = new Set(),
      returnComponentReferences = false,
      ignoreEmptyComponents = false,
      includeComponentTypes = true,
      includeIsNewMarks = true,
      includeReferencedComponents = false,
      target,
      ...otherOptions
    } = options;

    const resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
      setAttributesOnly: true,
      target,
      aggregationMode: 'intersection',
      includeReferencedComponents
    });

    return this.__serialize({
      ...otherOptions,
      attributeSelector: resolvedAttributeSelector,
      serializedComponents,
      returnComponentReferences,
      ignoreEmptyComponents,
      includeComponentTypes,
      includeIsNewMarks,
      includeReferencedComponents,
      target
    });
  }

  __serialize(options: SerializeOptions) {
    const {
      serializedComponents,
      componentDependencies,
      returnComponentReferences,
      ignoreEmptyComponents,
      includeComponentTypes,
      includeIsNewMarks,
      includeReferencedComponents,
      target
    } = options;

    const serializedComponent: PlainObject = {};

    if (includeComponentTypes) {
      serializedComponent.__component = this.getComponentType();
    }

    const isEmbedded = this.constructor.isEmbedded();

    if (!isEmbedded) {
      const hasAlreadyBeenSerialized = serializedComponents!.has(this);

      if (!hasAlreadyBeenSerialized) {
        serializedComponents!.add(this);

        if (componentDependencies !== undefined) {
          componentDependencies.add(this.constructor);

          for (const providedComponent of this.constructor.getProvidedComponents()) {
            componentDependencies.add(providedComponent);
          }

          for (const consumedComponent of this.constructor.getConsumedComponents()) {
            componentDependencies.add(consumedComponent);
          }
        }
      }

      if (hasAlreadyBeenSerialized || (returnComponentReferences && !includeReferencedComponents)) {
        Object.assign(serializedComponent, this.getIdentifierDescriptor());

        return serializedComponent;
      }
    }

    // TODO: Rethink the whole '__new' logic
    if (includeIsNewMarks && (isEmbedded || this.getIsNewMarkSource() !== target)) {
      serializedComponent.__new = this.getIsNewMark();
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

  __serializeAttributes(
    serializedComponent: PlainObject,
    options: SerializeOptions
  ): PromiseLikeable<number> {
    let {attributeSelector, attributeFilter} = options;

    let attributeCount = 0;

    return possiblyAsync(
      possiblyAsync.forEach(this.getAttributes({attributeSelector}), (attribute) => {
        const attributeName = attribute.getName();
        const subattributeSelector = getFromAttributeSelector(attributeSelector!, attributeName);

        return possiblyAsync(
          attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
          (isNotFilteredOut) => {
            if (isNotFilteredOut) {
              return possiblyAsync(
                attribute.serialize({
                  ...options,
                  attributeSelector: subattributeSelector,
                  returnComponentReferences: true
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

  /**
   * Deserializes the current component class from the specified plain object. Since the component classes are unique, they are deserialized "in place".
   *
   * @param object The plain object to deserialize from.
   * @param options.attributeFilter A (possibly async) function used to filter the attributes to be deserialized. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param source The source of the deserialization (default: `0`).
   *
   * @returns The current component class.
   */
  static deserialize<T extends typeof Component>(
    this: T,
    object: PlainObject = {},
    options: DeserializeOptions = {}
  ): T | PromiseLike<T> {
    const {__component: componentType, ...attributes} = object;
    const {deserializedComponents} = options;

    if (componentType !== undefined) {
      const expectedComponentType = this.getComponentType();

      if (componentType !== expectedComponentType) {
        throw new Error(
          `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
        );
      }
    }

    if (deserializedComponents !== undefined) {
      deserializedComponents.add(this);
    }

    return possiblyAsync(this.__deserializeAttributes(attributes, options), () =>
      possiblyAsync(this.initialize(), () => this)
    );
  }

  /**
   * Deserializes the specified plain object to an instance of the current component class.
   *
   * @param object The plain object to deserialize from.
   * @param options.attributeFilter A (possibly async) function used to filter the attributes to be deserialized. The function is invoked for each attribute with an `Attribute` instance as first argument.
   * @param source The source of the deserialization (default: `0`).
   *
   * @returns The deserialized component instance.
   */
  static deserializeInstance<T extends typeof Component>(
    this: T,
    object: PlainObject = {},
    options: DeserializeOptions = {}
  ): InstanceType<T> | PromiseLike<InstanceType<T>> {
    const {__component: componentType, __new: isNew, ...attributes} = object;
    const {attributeFilter, deserializedComponents, source} = options;

    if (componentType !== undefined) {
      const expectedComponentType = this.prototype.getComponentType();

      if (componentType !== expectedComponentType) {
        throw new Error(
          `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
        );
      }
    }

    const {identifierAttributes} = this.prototype.__partitionAttributes(attributes);

    let component: Component | undefined;

    if (!isNew && this.prototype.hasPrimaryIdentifierAttribute()) {
      component = this.getIdentityMap().getComponent(identifierAttributes);
    }

    if (component === undefined) {
      component = this.create(identifierAttributes, {
        isNew: Boolean(isNew),
        source,
        attributeSelector: {},
        attributeFilter,
        initialize: false
      });
    } else {
      if (isNew !== undefined) {
        component.setIsNewMark(isNew, {source});
      }
    }

    if (deserializedComponents !== undefined && !component.constructor.isEmbedded()) {
      deserializedComponents.add(component);
    }

    return possiblyAsync(component, (component) =>
      possiblyAsync(component.__deserializeAttributes(attributes, options), () => {
        if (isNew) {
          for (const attribute of component.getAttributes()) {
            if (!(attribute.isSet() || attribute.isControlled())) {
              attribute.setValue(attribute.evaluateDefault());
            }
          }
        }

        return possiblyAsync(component.initialize(), () => component);
      })
    );
  }

  // TODO: Consider removing this method
  deserialize<T extends Component>(
    this: T,
    object: PlainObject = {},
    options: DeserializeOptions = {}
  ): T | PromiseLike<T> {
    const {deserializedComponents, source} = options;

    const {__component: componentType, __new: isNew, ...attributes} = object;

    if (componentType !== undefined) {
      const expectedComponentType = this.getComponentType();

      if (componentType !== expectedComponentType) {
        throw new Error(
          `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
        );
      }
    }

    if (isNew !== undefined) {
      if (isNew && !this.getIsNewMark()) {
        throw new Error(
          `Cannot mark as new an existing non-new component (${this.describeComponent()})`
        );
      }

      this.setIsNewMark(isNew, {source});
    }

    if (deserializedComponents !== undefined && !this.constructor.isEmbedded()) {
      deserializedComponents.add(this);
    }

    return possiblyAsync(this.__deserializeAttributes(attributes, options), () =>
      possiblyAsync(this.initialize(), () => this)
    );
  }

  static get __deserializeAttributes() {
    return this.prototype.__deserializeAttributes;
  }

  __deserializeAttributes(
    serializedAttributes: PlainObject,
    options: DeserializeOptions
  ): void | PromiseLike<void> {
    const {attributeFilter} = options;

    const componentClass = ensureComponentClass(this);
    const componentGetter = (type: string) => componentClass.getComponentOfType(type);

    return possiblyAsync.forEach(
      Object.entries(serializedAttributes),
      ([attributeName, serializedAttributeValue]: [string, unknown]) => {
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
    );
  }

  static get __deserializeAttribute() {
    return this.prototype.__deserializeAttribute;
  }

  __deserializeAttribute(
    attribute: Attribute,
    serializedAttributeValue: unknown,
    componentGetter: ComponentGetter,
    options: DeserializeOptions
  ): void | PromiseLike<void> {
    const {source = 0} = options;

    // OPTIMIZE: Move the following logic into the Attribute class so we can avoid
    // deserializing two times in case of in place deserialization of nested models

    return possiblyAsync(
      deserialize(serializedAttributeValue, {...options, componentGetter}),
      (newAttributeValue) => {
        if (attribute.isSet()) {
          const previousAttributeValue = attribute.getValue();

          if (newAttributeValue === previousAttributeValue) {
            // Optimization
            attribute.setValueSource(source);
            return;
          }

          if (
            isComponentClassOrInstance(newAttributeValue) &&
            newAttributeValue.getComponentType() ===
              (previousAttributeValue as typeof Component | Component).getComponentType()
          ) {
            return (previousAttributeValue as any).deserialize(serializedAttributeValue, options);
          }
        }

        attribute.setValue(newAttributeValue, {source});
      }
    );
  }

  // === Introspection ===

  static introspect({
    _introspectedComponents = new Map()
  }: {_introspectedComponents?: IntrospectedComponentMap} = {}) {
    if (_introspectedComponents.has(this)) {
      return _introspectedComponents.get(this);
    }

    let introspectedComponent: IntrospectedComponent | undefined;

    const introspectedProperties = this.__introspectProperties();
    const introspectedPrototypeProperties = this.prototype.__introspectProperties();
    const introspectedProvidedComponents = this.__introspectProvidedComponents({
      _introspectedComponents
    });

    if (
      introspectedProperties.length > 0 ||
      introspectedPrototypeProperties.length > 0 ||
      introspectedProvidedComponents.length > 0
    ) {
      introspectedComponent = {
        name: this.getComponentName()
      };
    }

    _introspectedComponents.set(this, introspectedComponent);

    if (introspectedComponent === undefined) {
      return undefined;
    }

    if (this.isEmbedded()) {
      introspectedComponent.isEmbedded = true;
    }

    const introspectedMixins = this.__introspectMixins();

    if (introspectedMixins.length > 0) {
      introspectedComponent.mixins = introspectedMixins;
    }

    if (introspectedProperties.length > 0) {
      introspectedComponent.properties = introspectedProperties;
    }

    if (introspectedPrototypeProperties.length > 0) {
      introspectedComponent.prototype = {properties: introspectedPrototypeProperties};
    }

    if (introspectedProvidedComponents.length > 0) {
      introspectedComponent.providedComponents = introspectedProvidedComponents;
    }

    const introspectedConsumedComponents = this.__introspectConsumedComponents({
      _introspectedComponents
    });

    if (introspectedConsumedComponents.length > 0) {
      introspectedComponent.consumedComponents = introspectedConsumedComponents;
    }

    return introspectedComponent;
  }

  static __introspectMixins() {
    const introspectedMixins = new Array<string>();

    let currentClass = this;

    while (isComponentClass(currentClass)) {
      if (hasOwnProperty(currentClass, '__mixin')) {
        const mixinName = (currentClass as any).__mixin;

        if (!introspectedMixins.includes(mixinName)) {
          introspectedMixins.unshift(mixinName);
        }
      }

      currentClass = Object.getPrototypeOf(currentClass);
    }

    return introspectedMixins;
  }

  static get __introspectProperties() {
    return this.prototype.__introspectProperties;
  }

  __introspectProperties() {
    const introspectedProperties = [];

    for (const property of this.getProperties({autoFork: false})) {
      const introspectedProperty = property.introspect();

      if (introspectedProperty !== undefined) {
        introspectedProperties.push(introspectedProperty);
      }
    }

    return introspectedProperties;
  }

  static __introspectProvidedComponents({
    _introspectedComponents
  }: {
    _introspectedComponents: IntrospectedComponentMap;
  }) {
    const introspectedProvidedComponents = [];

    for (const providedComponent of this.getProvidedComponents()) {
      const introspectedProvidedComponent = providedComponent.introspect({_introspectedComponents});

      if (introspectedProvidedComponent !== undefined) {
        introspectedProvidedComponents.push(introspectedProvidedComponent);
      }
    }

    return introspectedProvidedComponents;
  }

  static __introspectConsumedComponents({
    _introspectedComponents
  }: {
    _introspectedComponents: IntrospectedComponentMap;
  }) {
    const introspectedConsumedComponents = [];

    for (const consumedComponent of this.getConsumedComponents()) {
      const introspectedConsumedComponent = consumedComponent.introspect({_introspectedComponents});

      if (introspectedConsumedComponent !== undefined) {
        introspectedConsumedComponents.push(consumedComponent.getComponentName());
      }
    }

    return introspectedConsumedComponents;
  }

  static unintrospect(
    introspectedComponent: IntrospectedComponent,
    options: {mixins?: ComponentMixin[]; methodBuilder?: MethodBuilder} = {}
  ): typeof Component {
    const {
      name,
      isEmbedded,
      mixins: introspectedMixins,
      properties: introspectedProperties,
      prototype: {properties: introspectedPrototypeProperties} = {},
      providedComponents: introspectedProvidedComponents,
      consumedComponents: introspectedConsumedComponents
    } = introspectedComponent;

    const {mixins = [], methodBuilder} = options;

    let UnintrospectedComponent = class extends Component {};

    if (isEmbedded) {
      UnintrospectedComponent.isEmbedded = function () {
        return true;
      };
    }

    if (introspectedMixins !== undefined) {
      UnintrospectedComponent = UnintrospectedComponent.__unintrospectMixins(introspectedMixins, {
        mixins
      });
    }

    const propertyClassGetter = UnintrospectedComponent.getPropertyClass;

    if (introspectedProperties !== undefined) {
      UnintrospectedComponent.__unintrospectProperties(
        introspectedProperties,
        propertyClassGetter,
        {methodBuilder}
      );
    }

    if (introspectedPrototypeProperties !== undefined) {
      UnintrospectedComponent.prototype.__unintrospectProperties(
        introspectedPrototypeProperties,
        propertyClassGetter,
        {methodBuilder}
      );
    }

    UnintrospectedComponent.setComponentName(name);

    if (introspectedProvidedComponents !== undefined) {
      UnintrospectedComponent.__unintrospectProvidedComponents(introspectedProvidedComponents, {
        mixins,
        methodBuilder
      });
    }

    if (introspectedConsumedComponents !== undefined) {
      UnintrospectedComponent.__unintrospectConsumedComponents(introspectedConsumedComponents);
    }

    UnintrospectedComponent.__setRemoteComponent(UnintrospectedComponent);

    if (methodBuilder !== undefined) {
      UnintrospectedComponent.__setRemoteMethodBuilder(methodBuilder);
    }

    return UnintrospectedComponent;
  }

  static __unintrospectMixins(introspectedMixins: string[], {mixins}: {mixins: ComponentMixin[]}) {
    let UnintrospectedComponentWithMixins = this;

    for (const mixinName of introspectedMixins) {
      const Mixin = mixins.find((Mixin) => getFunctionName(Mixin) === mixinName);

      if (Mixin === undefined) {
        throw new Error(
          `Couldn't find a component mixin named '${mixinName}'. Please make sure you specified it when creating your 'ComponentClient'.`
        );
      }

      UnintrospectedComponentWithMixins = Mixin(UnintrospectedComponentWithMixins);
    }

    return UnintrospectedComponentWithMixins;
  }

  static get __unintrospectProperties() {
    return this.prototype.__unintrospectProperties;
  }

  __unintrospectProperties(
    introspectedProperties: IntrospectedProperty[],
    propertyClassGetter: typeof Component['getPropertyClass'],
    {methodBuilder}: {methodBuilder: MethodBuilder | undefined}
  ) {
    for (const introspectedProperty of introspectedProperties) {
      const {type} = introspectedProperty;
      const PropertyClass = propertyClassGetter.call(ensureComponentClass(this), type);
      const {name, options} = PropertyClass.unintrospect(introspectedProperty);
      const property = this.setProperty(name, PropertyClass, options);

      if (isAttributeInstance(property)) {
        if (property.getExposure()?.set !== true) {
          property.markAsControlled();
        }
      } else if (isMethodInstance(property)) {
        if (
          property.getExposure()?.call === true &&
          methodBuilder !== undefined &&
          !(name in this)
        ) {
          Object.defineProperty(this, name, {
            value: methodBuilder(name),
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
      }
    }
  }

  static __unintrospectProvidedComponents(
    introspectedProvidedComponents: IntrospectedComponent[],
    {
      mixins,
      methodBuilder
    }: {mixins: ComponentMixin[] | undefined; methodBuilder: MethodBuilder | undefined}
  ) {
    for (const introspectedProvidedComponent of introspectedProvidedComponents) {
      this.provideComponent(
        Component.unintrospect(introspectedProvidedComponent, {mixins, methodBuilder})
      );
    }
  }

  static __unintrospectConsumedComponents(introspectedConsumedComponents: string[]) {
    for (const introspectedConsumedComponent of introspectedConsumedComponents) {
      this.consumeComponent(introspectedConsumedComponent);
    }
  }

  // === Remote component ===

  static __remoteComponent: typeof Component | undefined;

  static getRemoteComponent() {
    return this.__remoteComponent;
  }

  getRemoteComponent() {
    return this.constructor.getRemoteComponent()?.prototype;
  }

  static __setRemoteComponent(remoteComponent: typeof Component) {
    Object.defineProperty(this, '__remoteComponent', {value: remoteComponent});
  }

  // === Remote methods ===

  static get hasRemoteMethod() {
    return this.prototype.hasRemoteMethod;
  }

  hasRemoteMethod(name: string) {
    const remoteComponent = this.getRemoteComponent();

    if (!remoteComponent?.hasMethod(name)) {
      return false;
    }

    const remoteMethod = remoteComponent.getMethod(name, {autoFork: false});

    return remoteMethod.getExposure()?.call === true;
  }

  static get callRemoteMethod() {
    return this.prototype.callRemoteMethod;
  }

  callRemoteMethod(name: string, ...args: any[]): any {
    const remoteMethodBuilder = ensureComponentClass(this).__remoteMethodBuilder;

    if (remoteMethodBuilder === undefined) {
      throw new Error(
        `Cannot call the remote method '${name}' for a component that does not come from a component client (${this.describeComponent()})`
      );
    }

    return remoteMethodBuilder(name).apply(this, args);
  }

  static __remoteMethodBuilder: MethodBuilder | undefined;

  static __setRemoteMethodBuilder(methodBuilder: MethodBuilder) {
    Object.defineProperty(this, '__remoteMethodBuilder', {value: methodBuilder});
  }

  // === Utilities ===

  static isComponent(value: any): value is Component {
    return isComponentInstance(value);
  }

  static get toObject() {
    return this.prototype.toObject;
  }

  toObject(options: {minimize?: boolean} = {}) {
    const {minimize = false} = options;

    if (minimize) {
      if (isComponentClass(this)) {
        return {};
      }

      if (this.hasIdentifiers()) {
        return this.getIdentifierDescriptor();
      }
    }

    const object: PlainObject = {};

    const handleValue = (value: unknown): unknown => {
      if (isComponentClassOrInstance(value)) {
        const component = value;

        if (!ensureComponentClass(component).isEmbedded()) {
          return component.toObject({minimize: true});
        } else {
          return component.toObject({minimize});
        }
      }

      if (Array.isArray(value)) {
        return value.map(handleValue);
      }

      return value;
    };

    for (const attribute of this.getAttributes({setAttributesOnly: true})) {
      object[attribute.getName()] = handleValue(attribute.getValue());
    }

    return object;
  }

  static get describeComponent() {
    return this.prototype.describeComponent;
  }

  describeComponent(options: {componentPrefix?: string} = {}) {
    let {componentPrefix = ''} = options;

    if (componentPrefix !== '') {
      componentPrefix = `${componentPrefix} `;
    }

    return `${componentPrefix}component: '${ensureComponentClass(this).getComponentPath()}'`;
  }

  static describeComponentProperty(name: string) {
    return `${this.getComponentPath()}.${name}`;
  }

  describeComponentProperty(name: string) {
    return `${this.constructor.getComponentPath()}.prototype.${name}`;
  }
}

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
