import {Observable} from '@liaison/observable';
import {
  hasOwnProperty,
  isPrototypeOf,
  getTypeOf,
  PlainObject,
  isPlainObject,
  PromiseLikeable,
  getFunctionName
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
import {serialize, SerializeOptions} from './serialization';
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

export type IdentifierObject = {[name: string]: IdentifierValue};

export type IdentifierDescriptor = NormalizedIdentifierDescriptor | string | number;

export type NormalizedIdentifierDescriptor = {[name: string]: IdentifierValue};

export type ComponentGetter = (type: string) => typeof Component | Component;

export type ExpandAttributeSelectorOptions = {
  filter?: PropertyFilterSync;
  depth?: number;
  includeReferencedComponents?: boolean;
  _isDeep?: boolean;
  _attributeStack?: Set<Attribute>;
};

export type ComponentMixin = (Base: typeof Component) => typeof Component;

type MethodBuilder = (name: string) => Function;

export type IntrospectedComponent = {
  name: string;
  mixins?: string[];
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

  constructor(object: PlainObject = {}) {
    super();

    this.markAsNew();

    for (const attribute of this.getAttributes()) {
      const name = attribute.getName();
      const value = hasOwnProperty(object, name) ? object[name] : attribute.evaluateDefault();
      attribute.setValue(value);
      attribute._fixDecoration();
    }
  }

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
                const value = hasOwnProperty(object, name)
                  ? object[name]
                  : isNew
                  ? attribute.evaluateDefault()
                  : undefined;
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

  getIsNewMark() {
    return this.__isNew === true;
  }

  setIsNewMark(isNew: boolean, {source}: {source?: number} = {}) {
    Object.defineProperty(this, '__isNew', {value: isNew, configurable: true});
    this.setIsNewMarkSource(source);
  }

  isNew() {
    return this.getIsNewMark();
  }

  markAsNew({source}: {source?: number} = {}) {
    this.setIsNewMark(true, {source});
  }

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

  setAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, Attribute, attributeOptions);
  }

  static get getAttributes() {
    return this.prototype.getAttributes;
  }

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

  setPrimaryIdentifierAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, PrimaryIdentifierAttribute, attributeOptions);
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

  setSecondaryIdentifierAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, SecondaryIdentifierAttribute, attributeOptions);
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
      const value = identifierAttribute.getValue() as IdentifierValue;

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

  static getIdentityMap() {
    if (this.__identityMap === undefined) {
      Object.defineProperty(this, '__identityMap', {value: new IdentityMap(this)});
    } else if (!hasOwnProperty(this, '__identityMap')) {
      Object.defineProperty(this, '__identityMap', {value: this.__identityMap.fork(this)});
    }

    return this.__identityMap;
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

  setMethod(name: string, methodOptions: MethodOptions = {}) {
    return this.setProperty(name, Method, methodOptions);
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
      providedComponent = providedComponent.fork({componentProvider: this});
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
        // A component consumer should not be set directly
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
      // It can happen when a nested entity is forked
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
    const ghostIdentityMap = ghostClass.getIdentityMap();
    let ghostComponent = ghostIdentityMap.getComponent(identifiers);

    if (ghostComponent === undefined) {
      ghostComponent = this.fork({componentClass: ghostClass});
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
      const identityMap = this.constructor.getIdentityMap();
      identityMap.addComponent(this);
    }

    return this;
  }

  detach() {
    if (this.hasPrimaryIdentifierAttribute()) {
      const identityMap = this.constructor.getIdentityMap();
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

    const serializedComponent: PlainObject = {};

    if (includeComponentTypes) {
      serializedComponent.__component = this.getComponentType();
    }

    if (returnComponentReferences) {
      if (referencedComponents !== undefined) {
        for (const providedComponent of this.getProvidedComponents()) {
          referencedComponents.add(providedComponent);
        }

        for (const consumedComponent of this.getConsumedComponents()) {
          referencedComponents.add(consumedComponent);
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
      target,
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

    const hasIdentifers = this.hasIdentifiers();

    if (returnComponentReferences) {
      if (referencedComponents !== undefined) {
        for (const providedComponent of this.constructor.getProvidedComponents()) {
          referencedComponents.add(providedComponent);
        }

        for (const consumedComponent of this.constructor.getConsumedComponents()) {
          referencedComponents.add(consumedComponent);
        }

        referencedComponents.add(this.constructor);

        if (hasIdentifers) {
          referencedComponents.add(this);
        }
      }

      if (hasIdentifers) {
        Object.assign(serializedComponent, this.getIdentifierDescriptor());

        return serializedComponent;
      }
    }

    if (includeIsNewMarks && (!hasIdentifers || this.getIsNewMarkSource() !== target)) {
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

        // TODO
        // if (
        //   isStorable &&
        //   !isPrimaryIdentifierAttributeInstance(attribute) &&
        //   attribute.getValueSource() === target
        // ) {
        //   return;
        // }

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

    return possiblyAsync(this.__deserializeAttributes(attributes, options), () =>
      possiblyAsync(this.initialize(), () => this)
    );
  }

  static deserializeInstance<T extends typeof Component>(
    this: T,
    object: PlainObject = {},
    options: DeserializeOptions = {}
  ): InstanceType<T> | PromiseLike<InstanceType<T>> {
    const {__component: componentType, __new: isNew, ...attributes} = object;
    const {source, attributeFilter} = options;

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

    return possiblyAsync(component, (component) =>
      possiblyAsync(component.__deserializeAttributes(attributes, options), () => {
        if (isNew) {
          for (const attribute of component.getAttributes()) {
            if (!attribute.isSet()) {
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
    const {source} = options;

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
    const {source} = options;

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
      mixins: introspectedMixins,
      properties: introspectedProperties,
      prototype: {properties: introspectedPrototypeProperties} = {},
      providedComponents: introspectedProvidedComponents,
      consumedComponents: introspectedConsumedComponents
    } = introspectedComponent;

    const {mixins = [], methodBuilder} = options;

    let UnintrospectedComponent = class extends Component {};

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

      if (
        isMethodInstance(property) &&
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
    return `${this.constructor.getComponentPath()}#${name}`;
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
