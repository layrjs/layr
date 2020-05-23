import {Observable} from '@liaison/observable';
import {hasOwnProperty, isPrototypeOf, getTypeOf, PlainObject, isPlainObject} from 'core-helpers';
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
  removeFromAttributeSelector,
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
  getComponentInstanceTypeFromComponentName,
  joinAttributePath
} from './utilities';

export type IdentifierObject = {[name: string]: IdentifierValue};

export type IdentifierDescriptor = NormalizedIdentifierDescriptor | string | number;

export type NormalizedIdentifierDescriptor = {[name: string]: IdentifierValue};

export type ComponentGetter = (name: string) => typeof Component | Component;

export type ExpandAttributeSelectorOptions = {
  filter?: PropertyFilterSync;
  depth?: number;
  includeReferencedComponents?: boolean;
  _isDeep?: boolean;
  _attributeStack?: Set<Attribute>;
};

export type IntrospectedComponent = {
  name: string;
  // TODO: Consider adding a 'mixins' attribute
  properties?: (IntrospectedProperty | IntrospectedAttribute | IntrospectedMethod)[];
  prototype?: {
    properties?: (IntrospectedProperty | IntrospectedAttribute | IntrospectedMethod)[];
  };
  providedComponents?: IntrospectedComponent[];
  consumedComponents?: string[];
};

type IntrospectedComponentMap = Map<typeof Component, IntrospectedComponent | undefined>;

export class Component extends Observable(Object) {
  ['constructor']: typeof Component;

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
    const {isNew, attributeSelector = {}, attributeFilter, initialize = true} = options;

    let component: Component | undefined;

    if (this.prototype.hasPrimaryIdentifierAttribute()) {
      const identityMap = this.__getIdentityMap();
      component = identityMap.getComponent(object);

      if (component !== undefined) {
        if (isNew !== undefined) {
          if (isNew && !component.isNew()) {
            throw new Error(
              `Cannot mark as new an existing non-new component (${component.describeComponent()})`
            );
          }

          if (!isNew && component.isNew()) {
            component.markAsNotNew();
          }
        }
      }
    }

    if (component === undefined) {
      component = isNew
        ? new this({}, {attributeSelector: {}})
        : (Object.create(this.prototype) as Component);
    }

    return component.__finishInstantiation(object, {
      isNew: Boolean(isNew),
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
                  ? attribute.evaluateDefault()
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

  static getComponentType() {
    return getComponentClassTypeFromComponentName(this.getComponentName());
  }

  getComponentType() {
    return getComponentInstanceTypeFromComponentName(this.constructor.getComponentName());
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

  __constructorSourceCode?: string; // Used by @attribute() decorator

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
    const {filter, attributeSelector = true, setAttributesOnly = false, autoFork = true} = options;

    return this.getProperties<Attribute>({
      filter,
      autoFork,
      attributesOnly: true,
      attributeSelector,
      setAttributesOnly
    });
  }

  // === Identifier attributes ===

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

  setPrimaryIdentifierAttribute(
    name: string,
    attributeOptions: AttributeOptions = {},
    options: {returnDescriptor?: boolean} = {}
  ) {
    return this.setProperty(name, PrimaryIdentifierAttribute, attributeOptions, options);
  }

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

  setSecondaryIdentifierAttribute(
    name: string,
    attributeOptions: AttributeOptions = {},
    options: {returnDescriptor?: boolean} = {}
  ) {
    return this.setProperty(name, SecondaryIdentifierAttribute, attributeOptions, options);
  }

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

  getIdentifiers() {
    const identifiers = this.__getIdentifiers();

    if (identifiers === undefined) {
      throw new Error(
        `Cannot get the identifiers of a component that has no set identifier (${this.describeComponent()})`
      );
    }

    return identifiers;
  }

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
      const value = identifierAttribute.getValue();

      if (identifiers === undefined) {
        identifiers = {};
      }

      identifiers[name] = value;
    }

    return identifiers;
  }

  static generateId() {
    return cuid();
  }

  private static __identityMap: IdentityMap;

  static __getIdentityMap() {
    if (this.__identityMap === undefined) {
      Object.defineProperty(this, '__identityMap', {value: new IdentityMap(this)});
    } else if (!hasOwnProperty(this, '__identityMap')) {
      Object.defineProperty(this, '__identityMap', {value: this.__identityMap.fork(this)});
    }

    return this.__identityMap;
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

  getIdentifierDescriptor() {
    const identifierDescriptor = this.__getIdentifierDescriptor();

    if (identifierDescriptor === undefined) {
      throw new Error(
        `Cannot get an identifier descriptor from a component that has no set identifier (${this.describeComponent()})`
      );
    }

    return identifierDescriptor;
  }

  hasIdentifierDescriptor() {
    return this.__getIdentifierDescriptor() !== undefined;
  }

  __getIdentifierDescriptor(): NormalizedIdentifierDescriptor | undefined {
    const primaryIdentifierAttribute = this.getPrimaryIdentifierAttribute();

    if (primaryIdentifierAttribute.isSet()) {
      const name = primaryIdentifierAttribute.getName();
      const value = primaryIdentifierAttribute.getValue();

      return {[name]: value};
    }

    for (const secondaryIdentifierAttribute of this.getSecondaryIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = secondaryIdentifierAttribute.getName();
      const value = secondaryIdentifierAttribute.getValue();

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
      includeReferencedComponents = false,
      _isDeep = false,
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

    const hasPrimaryIdentifierAttribute = this.hasPrimaryIdentifierAttribute();

    // By default, referenced components are not expanded
    if (!(hasPrimaryIdentifierAttribute && _isDeep && !includeReferencedComponents)) {
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
            includeReferencedComponents,
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
    }

    // If the component has a primary identifier attribute, always include it
    if (hasPrimaryIdentifierAttribute) {
      const primaryIdentifierAttribute = this.getPrimaryIdentifierAttribute({autoFork: false});

      expandedAttributeSelector = setWithinAttributeSelector(
        expandedAttributeSelector,
        primaryIdentifierAttribute.getName(),
        true
      );
    }

    return expandedAttributeSelector;
  }

  // === Validation ===

  static get validate() {
    return this.prototype.validate;
  }

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

  static get isValid() {
    return this.prototype.isValid;
  }

  isValid(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  static get runValidators() {
    return this.prototype.runValidators;
  }

  runValidators(attributeSelector: AttributeSelector = true) {
    attributeSelector = this.expandAttributeSelector(attributeSelector);

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

  // === Dependency management ===

  // --- Component getters ---

  static getComponent(name: string) {
    const component = this.__getComponent(name);

    if (component === undefined) {
      throw new Error(
        `Cannot get the component '${name}' from the component '${this.getComponentPath()}'`
      );
    }

    return component;
  }

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

  static getComponentOfType(type: string) {
    const component = this.__getComponentOfType(type);

    if (component === undefined) {
      throw new Error(
        `Cannot get the component of type '${type}' from the component '${this.getComponentPath()}'`
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

  // --- Component provision ---

  static getProvidedComponent(name: string) {
    assertIsComponentName(name);

    const providedComponents = this.__getProvidedComponents();

    let providedComponent = providedComponents[name];

    if (providedComponent === undefined) {
      return undefined;
    }

    if (!hasOwnProperty(providedComponents, name)) {
      // Since the host component has been forked, the provided component must be forked as well
      providedComponent = providedComponent.fork({_newComponentProvider: this});
      providedComponents[name] = providedComponent;
    }

    return providedComponent;
  }

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

  static getProvidedComponents(
    options: {filter?: (providedComponent: typeof Component) => boolean} = {}
  ) {
    const {filter} = options;

    const component = this;

    return {
      *[Symbol.iterator]() {
        for (const name in component.__getProvidedComponents()) {
          const providedComponent = component.getProvidedComponent(name)!;

          if (filter !== undefined && !filter(providedComponent)) {
            continue;
          }

          yield providedComponent;
        }
      }
    };
  }

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
        throw new Error(
          `A component consumer may not be set directly (${this.describeComponent()}, property: '${name}')`
        );
      }
    });
  }

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

  clone<
    T extends Component,
    R = ReturnType<T['initialize']> extends PromiseLike<void> ? PromiseLike<T> : T
  >(this: T, options: CloneOptions = {}): R {
    const attributes: PlainObject = {};

    for (const attribute of this.getAttributes({setAttributesOnly: true})) {
      const name = attribute.getName();
      const value = attribute.getValue();

      attributes[name] = value;
    }

    const {identifierAttributes, otherAttributes} = this.__partitionAttributes(attributes);

    const clonedComponent = this.constructor.instantiate(identifierAttributes, {
      isNew: this.isNew(),
      initialize: false
    });

    if (clonedComponent === this) {
      return (this as unknown) as R;
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

  static fork<T extends typeof Component>(
    this: T,
    options: {_newComponentProvider?: typeof Component} = {}
  ) {
    const {_newComponentProvider} = options;

    const existingComponentProvider = this.__getComponentProvider();

    if (existingComponentProvider !== undefined && _newComponentProvider === undefined) {
      throw new Error(
        `Cannot fork a component class which is provided by another component; please consider forking the component root instead (${this.describeComponent()})`
      );
    }

    const name = this.getComponentName();

    // Use a little trick to make sure the generated subclass
    // has the 'name' attribute set properly
    // @ts-ignore
    const {[name]: forkedComponent} = {[name]: class extends this {}};

    if (_newComponentProvider !== undefined) {
      forkedComponent.__setComponentProvider(_newComponentProvider);
    }

    return forkedComponent as T;
  }

  fork<T extends Component>(this: T, options: ForkOptions = {}) {
    const {parentComponent} = options;

    const forkedComponent = Object.create(this) as T;

    if (parentComponent !== undefined) {
      assertIsComponentClassOrInstance(parentComponent);

      const component = ensureComponentClass(parentComponent).getComponent(
        this.constructor.getComponentName()
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

  static __ghost: typeof Component;

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

  getGhost<T extends Component>(this: T): T {
    const identifiers = this.getIdentifiers();
    const ghostClass = this.constructor.getGhost();
    const ghostIdentityMap = ghostClass.__getIdentityMap();
    let ghostComponent = ghostIdentityMap.getComponent(identifiers);

    if (ghostComponent === undefined) {
      ghostComponent = this.fork({parentComponent: ghostClass});
      ghostIdentityMap.addComponent(ghostComponent);
    }

    return ghostComponent as T;
  }

  // === Merging ===

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

  // === Attachment ===

  static __isAttached: boolean;

  static attach<T extends typeof Component>(this: T) {
    Object.defineProperty(this, '__isAttached', {value: true, configurable: true});

    return this;
  }

  static detach<T extends typeof Component>(this: T) {
    Object.defineProperty(this, '__isAttached', {value: false, configurable: true});

    return this;
  }

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

  static isDetached() {
    return !this.isAttached();
  }

  __isAttached?: boolean;

  attach() {
    Object.defineProperty(this, '__isAttached', {value: true, configurable: true});

    if (this.hasPrimaryIdentifierAttribute()) {
      const identityMap = this.constructor.__getIdentityMap();
      identityMap.addComponent(this);
    }

    return this;
  }

  detach() {
    if (this.hasPrimaryIdentifierAttribute()) {
      const identityMap = this.constructor.__getIdentityMap();
      identityMap.removeComponent(this);
    }

    Object.defineProperty(this, '__isAttached', {value: false, configurable: true});

    return this;
  }

  isAttached() {
    if (this.__isAttached !== undefined) {
      return this.__isAttached;
    }

    return this.constructor.isAttached();
  }

  isDetached() {
    return !this.isAttached();
  }

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
        for (const providedComponent of this.getProvidedComponents()) {
          referencedComponents.add(providedComponent);
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

    if (returnComponentReferences && !includeComponentTypes) {
      throw new Error(
        `The 'returnComponentReferences' option cannot be 'true' when the 'includeComponentTypes' option is 'false' (${this.describeComponent()})`
      );
    }

    const serializedComponent: PlainObject = {};

    if (includeComponentTypes) {
      serializedComponent.__component = this.getComponentType();
    }

    if (includeIsNewMarks && this.isNew()) {
      serializedComponent.__new = true;
    }

    if (returnComponentReferences) {
      const hasPrimaryIdentifierAttribute = this.hasPrimaryIdentifierAttribute();

      if (referencedComponents !== undefined) {
        for (const providedComponent of this.constructor.getProvidedComponents()) {
          referencedComponents.add(providedComponent);
        }

        referencedComponents.add(this.constructor);

        if (hasPrimaryIdentifierAttribute) {
          referencedComponents.add(this);
        }
      }

      if (hasPrimaryIdentifierAttribute) {
        Object.assign(serializedComponent, this.getIdentifierDescriptor());

        return serializedComponent;
      }
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
    let {includeReferencedComponents = false, attributeSelector = true, attributeFilter} = options;

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
                  returnComponentReferences: !includeReferencedComponents
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
      const otherAttributeSelector = createAttributeSelectorFromNames(Object.keys(otherAttributes));
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
      (instantiatedComponent) => instantiatedComponent.__finishDeserialization(attributes, options)
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
            return previousAttributeValue.deserialize(serializedAttributeValue, options);
          }
        }

        attribute.setValue(newAttributeValue);
      }
    );
  }

  // === Introspection ===

  static introspect(_introspectedComponents: IntrospectedComponentMap = new Map()) {
    if (_introspectedComponents.has(this)) {
      return _introspectedComponents.get(this);
    }

    let introspectedComponent: IntrospectedComponent | undefined;

    const introspectedProperties = this.introspectProperties();
    const introspectedPrototypeProperties = this.prototype.introspectProperties();
    const introspectedProvidedComponents = this.__introspectProvidedComponents(
      _introspectedComponents
    );

    if (
      introspectedProperties.length > 0 ||
      introspectedPrototypeProperties.length > 0 ||
      introspectedProvidedComponents.length > 0
    ) {
      introspectedComponent = {
        name: this.getComponentName()
        // TODO: Consider adding a 'mixins' attribute
      };
    }

    _introspectedComponents.set(this, introspectedComponent);

    if (introspectedComponent === undefined) {
      return undefined;
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

    const introspectedConsumedComponents = this.__introspectConsumedComponents(
      _introspectedComponents
    );

    if (introspectedConsumedComponents.length > 0) {
      introspectedComponent.consumedComponents = introspectedConsumedComponents;
    }

    return introspectedComponent;
  }

  static __introspectProvidedComponents(_introspectedComponents: IntrospectedComponentMap) {
    const introspectedProvidedComponents = [];

    for (const providedComponent of this.getProvidedComponents()) {
      const introspectedProvidedComponent = providedComponent.introspect(_introspectedComponents);

      if (introspectedProvidedComponent !== undefined) {
        introspectedProvidedComponents.push(introspectedProvidedComponent);
      }
    }

    return introspectedProvidedComponents;
  }

  static __introspectConsumedComponents(_introspectedComponents: IntrospectedComponentMap) {
    const introspectedConsumedComponents = [];

    for (const consumedComponent of this.getConsumedComponents()) {
      const introspectedConsumedComponent = consumedComponent.introspect(_introspectedComponents);

      if (introspectedConsumedComponent !== undefined) {
        introspectedConsumedComponents.push(consumedComponent.getComponentName());
      }
    }

    return introspectedConsumedComponents;
  }

  static unintrospect(introspectedComponent: IntrospectedComponent) {
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

  static get introspectProperties() {
    return this.prototype.introspectProperties;
  }

  introspectProperties() {
    const introspectedProperties = [];

    for (const property of this.getProperties({autoFork: false})) {
      const introspectedProperty = property.introspect();

      if (introspectedProperty !== undefined) {
        introspectedProperties.push(introspectedProperty);
      }
    }

    return introspectedProperties;
  }

  static get unintrospectProperties() {
    return this.prototype.unintrospectProperties;
  }

  unintrospectProperties(introspectedProperties: IntrospectedProperty[]) {
    for (const introspectedProperty of introspectedProperties) {
      const {type} = introspectedProperty;
      const PropertyClass = ensureComponentClass(this).getPropertyClass(type);
      const {name, options} = PropertyClass.unintrospect(introspectedProperty);
      this.setProperty(name, PropertyClass, options);
    }
  }

  // static getRemoteComponent() {
  //   return this.__RemoteComponent;
  // }

  // static __setRemoteComponent(RemoteComponent) {
  //   this.__RemoteComponent = RemoteComponent; // TODO: Use Object.defineProperty()
  // }

  // getRemoteComponent() {
  //   return this.constructor.getRemoteComponent()?.prototype;
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

    return `${componentPrefix}component: '${ensureComponentClass(this).getComponentPath()}'`;
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
