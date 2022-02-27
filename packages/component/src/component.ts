import {Observable} from '@layr/observable';
import {throwError} from '@layr/utilities';
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
import isEmpty from 'lodash/isEmpty';

import {
  Property,
  PropertyOptions,
  PropertyOperationSetting,
  PropertyFilterSync,
  IntrospectedProperty,
  Attribute,
  isAttributeClass,
  isAttributeInstance,
  AttributeOptions,
  ValueSource,
  IntrospectedAttribute,
  IdentifierAttribute,
  isIdentifierAttributeInstance,
  PrimaryIdentifierAttribute,
  isPrimaryIdentifierAttributeInstance,
  SecondaryIdentifierAttribute,
  isSecondaryIdentifierAttributeInstance,
  IdentifierValue,
  AttributeSelector,
  getFromAttributeSelector,
  setWithinAttributeSelector,
  normalizeAttributeSelector,
  Method,
  isMethodInstance,
  MethodOptions,
  IntrospectedMethod,
  isComponentValueTypeInstance
} from './properties';
import {IdentityMap} from './identity-map';
import {clone, CloneOptions} from './cloning';
import {ForkOptions} from './forking';
import {merge, MergeOptions} from './merging';
import {SerializeOptions} from './serialization';
import {DeserializeOptions} from './deserialization';
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

export type ComponentMixin = (Base: typeof Component) => typeof Component;

export type TraverseAttributesIteratee = (attribute: Attribute) => void;

export type TraverseAttributesOptions = {
  attributeSelector: AttributeSelector;
  setAttributesOnly: boolean;
};

export type IdentifierDescriptor = NormalizedIdentifierDescriptor | IdentifierValue;

export type NormalizedIdentifierDescriptor = {[name: string]: IdentifierValue};

export type IdentifierSelector = NormalizedIdentifierSelector | IdentifierValue;

export type NormalizedIdentifierSelector = {[name: string]: IdentifierValue};

export type ResolveAttributeSelectorOptions = {
  filter?: PropertyFilterSync;
  setAttributesOnly?: boolean;
  target?: ValueSource;
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

export type ExecutionMode = 'foreground' | 'background';

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
 * *Inherits from [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class).*
 *
 * A component is an elementary building block allowing you to define your data models and implement the business logic of your application. Typically, an application is composed of several components that are connected to each other by using the [`@provide()`](https://layrjs.com/docs/v2/reference/component#provide-decorator) and [`@consume()`](https://layrjs.com/docs/v2/reference/component#consume-decorator) decorators.
 *
 * #### Usage
 *
 * Just extend the `Component` class to define a component with some attributes and methods that are specific to your application.
 *
 * For example, a `Movie` component with a `title` attribute and a `play()` method could be defined as follows:
 *
 * ```
 * // JS
 *
 * import {Component} from '@layr/component';
 *
 * class Movie extends Component {
 *   ﹫attribute('string') title;
 *
 *   ﹫method() play() {
 *     console.log(`Playing '${this.title}...'`);
 *   }
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component} from '@layr/component';
 *
 * class Movie extends Component {
 *   ﹫attribute('string') title!: string;
 *
 *   ﹫method() play() {
 *     console.log(`Playing '${this.title}...'`);
 *   }
 * }
 * ```
 *
 * The [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) and [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorators allows you to get the full power of Layr, such as attribute validation or remote method invocation.
 *
 * > Note that you don't need to use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator for all your methods. Typically, you use this decorator only for some backend methods that you want to expose to the frontend.
 *
 * Once you have defined a component, you can use it as any JavaScript/TypeScript class:
 *
 * ```
 * const movie = new Movie({title: 'Inception'});
 *
 * movie.play(); // => 'Playing Inception...'
 * ```
 *
 * #### Embedded Components
 *
 * Use the [`EmbeddedComponent`](https://layrjs.com/docs/v2/reference/embedded-component) class to embed a component into another component. An embedded component is strongly attached to the parent component that owns it, and it cannot "live" by itself like a regular component.
 *
 * Here are some characteristics of an embedded component:
 *
 * - An embedded component has one parent only, and therefore cannot be embedded in more than one component.
 * - When the parent of an embedded component is [validated](https://layrjs.com/docs/v2/reference/validator), the embedded component is validated as well.
 * - When the parent of an embedded component is loaded, saved, or deleted (using a [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storage-operations) method), the embedded component is loaded, saved, or deleted as well.
 *
 * See the [`EmbeddedComponent`](https://layrjs.com/docs/v2/reference/embedded-component) class for an example of use.
 *
 * #### Referenced Components
 *
 * Any non-embedded component can be referenced by another component. Contrary to an embedded component, a referenced component is an independent entity that can "live" by itself. So a referenced component behaves like a regular JavaScript object that can be referenced by another object.
 *
 * Here are some characteristics of a referenced component:
 *
 * - A referenced component can be referenced by any number of components.
 * - When a component holding a reference to another component is [validated](https://layrjs.com/docs/v2/reference/validator), the referenced component is considered as an independent entity, and is therefore not validated automatically.
 * - When a component holding a reference to another component is loaded, saved, or deleted (using a [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storage-operations) method), the referenced component may optionally be loaded in the same operation, but it has to be saved or deleted independently.
 *
 * For example, let's say we have a `Director` component defined as follows:
 *
 * ```
 * // JS
 *
 * class Director extends Component {
 *   ﹫attribute('string') fullName;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * class Director extends Component {
 *   ﹫attribute('string') fullName!: string;
 * }
 * ```
 *
 * Next, we can add an attribute to the `Movie` component to store a reference to a `Director`:
 *
 * ```
 * // JS
 *
 * class Movie extends Component {
 *   ﹫provide() static Director = Director;
 *
 *   // ...
 *
 *   ﹫attribute('Director') director;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * class Movie extends Component {
 *   ﹫provide() static Director = Director;
 *
 *   // ...
 *
 *   ﹫attribute('Director') director!: Director;
 * }
 * ```
 *
 * > Note that to be able to specify the `'Director'` type for the `director` attribute, you first have to make the `Movie` component aware of the `Director` component by using the [`@provide()`](https://layrjs.com/docs/v2/reference/component#provide-decorator) decorator.
 *
 *  Then, to create a `Movie` with a `Director`, we can do something like the following:
 *
 * ```
 * const movie = new Movie({
 *   title: 'Inception',
 *   director: new Director({fullName: 'Christopher Nolan'})
 * });
 *
 * movie.title; // => 'Inception'
 * movie.director.fullName; // => 'Christopher Nolan'
 * ```
 */
export class Component extends Observable(Object) {
  ['constructor']: typeof Component;

  // === Creation ===

  /**
   * Creates an instance of a component class.
   *
   * @param [object] An optional object specifying the value of the component attributes.
   *
   * @returns The component instance that was created.
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, attribute} from '﹫layr/component';
   *
   * class Movie extends Component {
   *   ﹫attribute('string') title;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.title // => 'Inception'
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, attribute} from '﹫layr/component';
   *
   * class Movie extends Component {
   *   ﹫attribute('string') title!: string;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.title // => 'Inception'
   * ```
   *
   * @category Creation
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

  static instantiate<T extends typeof Component>(
    this: T,
    identifiers?: IdentifierSelector,
    options: {
      source?: ValueSource;
    } = {}
  ): InstanceType<T> {
    const {source} = options;

    let component: InstanceType<T> | undefined;

    if (this.prototype.hasPrimaryIdentifierAttribute()) {
      if (identifiers === undefined) {
        throw new Error(
          `An identifier is required to instantiate an identifiable component, but received a value of type '${getTypeOf(
            identifiers
          )}' (${this.describeComponent()})`
        );
      }

      identifiers = this.normalizeIdentifierSelector(identifiers);

      component = this.getIdentityMap().getComponent(identifiers) as InstanceType<T> | undefined;

      if (component === undefined) {
        component = Object.create(this.prototype);

        for (const [name, value] of Object.entries(identifiers)) {
          component!.getAttribute(name).setValue(value, {source});
        }
      }
    } else {
      // The component does not have an identifier attribute

      if (!(identifiers === undefined || (isPlainObject(identifiers) && isEmpty(identifiers)))) {
        throw new Error(
          `Cannot instantiate an unidentifiable component with an identifier (${this.describeComponent()})`
        );
      }

      component = Object.create(this.prototype);
    }

    return component!;
  }

  // === Initialization ===

  /**
   * Invoke this method to call any `initializer()` static method defined in your component classes.
   *
   * If the current class has an `initializer()` static method, it is invoked, and if the current class has some other components as dependencies, the `initializer()` method is also invoked for those components.
   *
   * Note that your `initializer()` methods can be asynchronous, and therefore you should call the `initialize()` method with `await`.
   *
   * Typically, you will call the `initialize()` method on the root component of your frontend application when your application starts. Backend applications are usually managed by a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server), which automatically invokes the `initialize()` method on the root component.
   *
   * Note that if you use [Boostr](https://boostr.dev) to manage your frontend application, you should not call the `initialize()` method manually.
   *
   * @category Initialization
   * @possiblyasync
   */
  static initialize() {
    return possiblyAsync.forEach(this.traverseComponents(), (component) => {
      const initializer = (component as any).initializer;

      if (typeof initializer === 'function') {
        return initializer.call(component);
      }
    });
  }

  // === Naming ===

  static getBaseComponentName() {
    return 'Component';
  }

  /**
   * Returns the name of the component, which is usually the name of the corresponding class.
   *
   * @returns A string.
   *
   * @example
   * ```
   * Movie.getComponentName(); // => 'Movie'
   * ```
   *
   * @category Naming
   */
  static getComponentName() {
    const name = this.name;

    if (typeof name === 'string' && name !== '') {
      return name;
    }

    throw new Error('The name of the component is missing');
  }

  /**
   * Sets the name of the component. As the name of a component is usually inferred from the name of its class, this method should rarely be used.
   *
   * @param name The name you wish for the component.
   *
   * @example
   * ```
   * Movie.getComponentName(); // => 'Movie'
   * Movie.setComponentName('Film');
   * Movie.getComponentName(); // => 'Film'
   * ```
   *
   * @category Naming
   */
  static setComponentName(name: string) {
    assertIsComponentName(name);

    Object.defineProperty(this, 'name', {value: name});
  }

  /**
   * Returns the path of the component starting from its root component.
   *
   * For example, if an `Application` component provides a `Movie` component, this method will return `'Application.Movie'` when called on the `Movie` component.
   *
   * @returns A string.
   *
   * @example
   * ```
   * class Movie extends Component {}
   *
   * Movie.getComponentPath(); // => 'Movie'
   *
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * Movie.getComponentPath(); // => 'Application.Movie'
   * ```
   *
   * @category Naming
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
   * Returns the type of the component class. A component class type is composed of the component class name prefixed with the string `'typeof '`.
   *
   * For example, with a component class named `'Movie'`, this method will return `'typeof Movie'`.
   *
   * @returns A string.
   *
   * @example
   * ```
   * Movie.getComponentType(); // => 'typeof Movie'
   * ```
   *
   * @category Typing
   */
  static getComponentType() {
    return getComponentClassTypeFromComponentName(this.getComponentName());
  }

  /**
   * Returns the type of the component instance. A component instance type is equivalent to the component class name.
   *
   * For example, with a component class named `'Movie'`, this method will return `'Movie'` when called on a `Movie` instance.
   *
   * @returns A string.
   *
   * @example
   * ```
   * Movie.prototype.getComponentType(); // => 'Movie'
   *
   * const movie = new Movie();
   * movie.getComponentType(); // => 'Movie'
   * ```
   *
   * @category Typing
   */
  getComponentType() {
    return getComponentInstanceTypeFromComponentName(this.constructor.getComponentName());
  }

  // === isNew Mark ===

  __isNew: boolean | undefined;

  /**
   * Returns whether the component instance is marked as new or not.
   *
   * @alias isNew
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * let movie = new Movie();
   * movie.getIsNewMark(); // => true
   * ```
   *
   * @category isNew Mark
   */
  getIsNewMark() {
    return this.__isNew === true;
  }

  /**
   * Sets whether the component instance is marked as new or not.
   *
   * @param isNew A boolean specifying if the component instance should be marked as new or not.
   *
   * @example
   * ```
   * const movie = new Movie();
   * movie.getIsNewMark(); // => true
   * movie.setIsNewMark(false);
   * movie.getIsNewMark(); // => false
   * ```
   *
   * @category isNew Mark
   */
  setIsNewMark(isNew: boolean) {
    Object.defineProperty(this, '__isNew', {value: isNew, configurable: true});
  }

  /**
   * Returns whether the component instance is marked as new or not.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * let movie = new Movie();
   * movie.isNew(); // => true
   * ```
   *
   * @category isNew Mark
   */
  isNew() {
    return this.getIsNewMark();
  }

  /**
   * Marks the component instance as new.
   *
   * This method is a shortcut for `setIsNewMark(true)`.
   *
   * @category isNew Mark
   */
  markAsNew() {
    this.setIsNewMark(true);
  }

  /**
   * Marks the component instance as not new.
   *
   * This method is a shortcut for `setIsNewMark(false)`.
   *
   * @category isNew Mark
   */
  markAsNotNew() {
    this.setIsNewMark(false);
  }

  // === Observability ===

  /**
   * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.
   *
   * @category Observability
   */

  // === Embeddability ===

  /**
   * Returns whether the component is an [`EmbeddedComponent`](https://layrjs.com/docs/v2/reference/embedded-component).
   *
   * @returns A boolean.
   *
   * @category Embeddability
   */
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
   * Gets a property of the component.
   *
   * @param name The name of the property to get.
   *
   * @returns An instance of a [`Property`](https://layrjs.com/docs/v2/reference/property) (or a subclass of [`Property`](https://layrjs.com/docs/v2/reference/property) such as [`Attribute`](https://layrjs.com/docs/v2/reference/attribute), [`Method`](https://layrjs.com/docs/v2/reference/method), etc.).
   *
   * @example
   * ```
   * movie.getProperty('title'); // => 'title' attribute property
   * movie.getProperty('play'); // => 'play()' method property
   * ```
   *
   * @category Properties
   */
  static get getProperty() {
    return this.prototype.getProperty;
  }

  /**
   * Gets a property of the component.
   *
   * @param name The name of the property to get.
   *
   * @returns An instance of a [`Property`](https://layrjs.com/docs/v2/reference/property) (or a subclass of [`Property`](https://layrjs.com/docs/v2/reference/property) such as [`Attribute`](https://layrjs.com/docs/v2/reference/attribute), [`Method`](https://layrjs.com/docs/v2/reference/method), etc.).
   *
   * @example
   * ```
   * movie.getProperty('title'); // => 'title' attribute property
   * movie.getProperty('play'); // => 'play()' method property
   * ```
   *
   * @category Properties
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
   * Returns whether the component has the specified property.
   *
   * @param name The name of the property to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasProperty('title'); // => true
   * movie.hasProperty('play'); // => true
   * movie.hasProperty('name'); // => false
   * ```
   *
   * @category Properties
   */
  static get hasProperty() {
    return this.prototype.hasProperty;
  }

  /**
   * Returns whether the component has the specified property.
   *
   * @param name The name of the property to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasProperty('title'); // => true
   * movie.hasProperty('play'); // => true
   * movie.hasProperty('name'); // => false
   * ```
   *
   * @category Properties
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
   * Defines a property in the component. Typically, instead of using this method, you would rather use a decorator such as [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) or [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator).
   *
   * @param name The name of the property to define.
   * @param PropertyClass The class of the property (e.g., [`Attribute`](https://layrjs.com/docs/v2/reference/attribute), [`Method`](https://layrjs.com/docs/v2/reference/method)) to use.
   * @param [propertyOptions] The options to create the `PropertyClass`.
   *
   * @returns The property that was created.
   *
   * @example
   * ```
   * Movie.prototype.setProperty('title', Attribute, {valueType: 'string'});
   * ```
   *
   * @category Properties
   */
  static get setProperty() {
    return this.prototype.setProperty;
  }

  /**
   * Defines a property in the component. Typically, instead of using this method, you would rather use a decorator such as [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) or [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator).
   *
   * @param name The name of the property to define.
   * @param PropertyClass The class of the property (e.g., [`Attribute`](https://layrjs.com/docs/v2/reference/attribute), [`Method`](https://layrjs.com/docs/v2/reference/method)) to use.
   * @param [propertyOptions] The options to create the `PropertyClass`.
   *
   * @returns The property that was created.
   *
   * @example
   * ```
   * Movie.prototype.setProperty('title', Attribute, {valueType: 'string'});
   * ```
   *
   * @category Properties
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
   * Removes a property from the component. If the specified property doesn't exist, nothing happens.
   *
   * @param name The name of the property to remove.
   *
   * @returns A boolean.
   *
   * @category Properties
   */
  static get deleteProperty() {
    return this.prototype.deleteProperty;
  }

  /**
   * Removes a property from the component. If the specified property doesn't exist, nothing happens.
   *
   * @param name The name of the property to remove.
   *
   * @returns A boolean.
   *
   * @category Properties
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
   * Returns an iterator providing the properties of the component.
   *
   * @param [options.filter] A function used to filter the properties to be returned. The function is invoked for each property with a [`Property`](https://layrjs.com/docs/v2/reference/property) instance as first argument.
   * @param [options.attributesOnly] A boolean specifying whether only attribute properties should be returned (default: `false`).
   * @param [options.setAttributesOnly] A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be returned (default: `true`, which means that all the attributes should be returned).
   * @param [options.methodsOnly] A boolean specifying whether only method properties should be returned (default: `false`).
   *
   * @returns A [`Property`](https://layrjs.com/docs/v2/reference/property) instance iterator.
   *
   * @example
   * ```
   * for (const property of movie.getProperties()) {
   *   console.log(property.getName());
   * }
   *
   * // Should output:
   * // title
   * // play
   * ```
   *
   * @category Properties
   */
  static get getProperties() {
    return this.prototype.getProperties;
  }

  /**
   * Returns an iterator providing the properties of the component.
   *
   * @param [options.filter] A function used to filter the properties to be returned. The function is invoked for each property with a [`Property`](https://layrjs.com/docs/v2/reference/property) instance as first argument.
   * @param [options.attributesOnly] A boolean specifying whether only attribute properties should be returned (default: `false`).
   * @param [options.setAttributesOnly] A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be returned (default: `true`, which means that all the attributes should be returned).
   * @param [options.methodsOnly] A boolean specifying whether only method properties should be returned (default: `false`).
   *
   * @returns A [`Property`](https://layrjs.com/docs/v2/reference/property) instance iterator.
   *
   * @example
   * ```
   * for (const property of movie.getProperties()) {
   *   console.log(property.getName());
   * }
   *
   * // Should output:
   * // title
   * // play
   * ```
   *
   * @category Properties
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
   * Returns the name of all the properties of the component.
   *
   * @returns An array of the property names.
   *
   * @example
   * ```
   * movie.getPropertyNames(); // => ['title', 'play']
   * ```
   *
   * @category Properties
   */
  static get getPropertyNames() {
    return this.prototype.getPropertyNames;
  }

  /**
   * Returns the name of all the properties of the component.
   *
   * @returns An array of the property names.
   *
   * @example
   * ```
   * movie.getPropertyNames(); // => ['title', 'play']
   * ```
   *
   * @category Properties
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

  // === Attribute Properties ===

  __constructorSourceCode?: string; // Used by @attribute() decorator

  /**
   * Gets an attribute of the component.
   *
   * @param name The name of the attribute to get.
   *
   * @returns An instance of [`Attribute`](https://layrjs.com/docs/v2/reference/attribute).
   *
   * @example
   * ```
   * movie.getAttribute('title'); // => 'title' attribute property
   * movie.getAttribute('play'); // => Error ('play' is a method)
   * ```
   *
   * @category Attribute Properties
   */
  static get getAttribute() {
    return this.prototype.getAttribute;
  }

  /**
   * Gets an attribute of the component.
   *
   * @param name The name of the attribute to get.
   *
   * @returns An instance of [`Attribute`](https://layrjs.com/docs/v2/reference/attribute).
   *
   * @example
   * ```
   * movie.getAttribute('title'); // => 'title' attribute property
   * movie.getAttribute('play'); // => Error ('play' is a method)
   * ```
   *
   * @category Attribute Properties
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
   * Returns whether the component has the specified attribute.
   *
   * @param name The name of the attribute to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasAttribute('title'); // => true
   * movie.hasAttribute('name'); // => false
   * movie.hasAttribute('play'); // => Error ('play' is a method)
   * ```
   *
   * @category Attribute Properties
   */
  static get hasAttribute() {
    return this.prototype.hasAttribute;
  }

  /**
   * Returns whether the component has the specified attribute.
   *
   * @param name The name of the attribute to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasAttribute('title'); // => true
   * movie.hasAttribute('name'); // => false
   * movie.hasAttribute('play'); // => Error ('play' is a method)
   * ```
   *
   * @category Attribute Properties
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
   * Defines an attribute in the component. Typically, instead of using this method, you would rather use the [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) decorator.
   *
   * @param name The name of the attribute to define.
   * @param [attributeOptions] The options to create the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#constructor).
   *
   * @returns The [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) that was created.
   *
   * @example
   * ```
   * Movie.prototype.setAttribute('title', {valueType: 'string'});
   * ```
   *
   * @category Attribute Properties
   */
  static get setAttribute() {
    return this.prototype.setAttribute;
  }

  /**
   * Defines an attribute in the component. Typically, instead of using this method, you would rather use the [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) decorator.
   *
   * @param name The name of the attribute to define.
   * @param [attributeOptions] The options to create the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#constructor).
   *
   * @returns The [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) that was created.
   *
   * @example
   * ```
   * Movie.prototype.setAttribute('title', {valueType: 'string'});
   * ```
   *
   * @category Attribute Properties
   */
  setAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, Attribute, attributeOptions);
  }

  /**
   * Returns an iterator providing the attributes of the component.
   *
   * @param [options.filter] A function used to filter the attributes to be returned. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
   * @param [options.setAttributesOnly] A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be returned (default: `true`, which means that all the attributes should be returned).
   *
   * @returns An [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance iterator.
   *
   * @example
   * ```
   * for (const attr of movie.getAttributes()) {
   *   console.log(attr.getName());
   * }
   *
   * // Should output:
   * // title
   * ```
   *
   * @category Attribute Properties
   */
  static get getAttributes() {
    return this.prototype.getAttributes;
  }

  /**
   * Returns an iterator providing the attributes of the component.
   *
   * @param [options.filter] A function used to filter the attributes to be returned. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
   * @param [options.setAttributesOnly] A boolean specifying whether only set attributes should be returned (default: `false`).
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be returned (default: `true`, which means that all the attributes should be returned).
   *
   * @returns An [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance iterator.
   *
   * @example
   * ```
   * for (const attr of movie.getAttributes()) {
   *   console.log(attr.getName());
   * }
   *
   * // Should output:
   * // title
   * ```
   *
   * @category Attribute Properties
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
   * Gets an identifier attribute of the component.
   *
   * @param name The name of the identifier attribute to get.
   *
   * @returns An instance of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) or [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).
   *
   * @example
   * ```
   * movie.getIdentifierAttribute('id'); // => 'id' primary identifier attribute
   * movie.getIdentifierAttribute('slug'); // => 'slug' secondary identifier attribute
   * ```
   *
   * @category Attribute Properties
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
   * Returns whether the component has the specified identifier attribute.
   *
   * @param name The name of the identifier attribute to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasIdentifierAttribute('id'); // => true
   * movie.hasIdentifierAttribute('slug'); // => true
   * movie.hasIdentifierAttribute('name'); // => false (the property 'name' doesn't exist)
   * movie.hasIdentifierAttribute('title'); // => Error ('title' is not an identifier attribute)
   * ```
   *
   * @category Attribute Properties
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
   * Gets the primary identifier attribute of the component.
   *
   * @returns An instance of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).
   *
   * @example
   * ```
   * movie.getPrimaryIdentifierAttribute(); // => 'id' primary identifier attribute
   * ```
   *
   * @category Attribute Properties
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
   * Returns whether the component as a primary identifier attribute.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasPrimaryIdentifierAttribute(); // => true
   * ```
   *
   * @category Attribute Properties
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
   * Defines the primary identifier attribute of the component. Typically, instead of using this method, you would rather use the [`@primaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#primary-identifier-decorator) decorator.
   *
   * @param name The name of the primary identifier attribute to define.
   * @param [attributeOptions] The options to create the [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).
   *
   * @returns The [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) that was created.
   *
   * @example
   * ```
   * User.prototype.setPrimaryIdentifierAttribute('id', {
   *   valueType: 'number',
   *   default() {
   *     return Math.random();
   *   }
   * });
   * ```
   *
   * @category Attribute Properties
   */
  setPrimaryIdentifierAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, PrimaryIdentifierAttribute, attributeOptions);
  }

  /**
   * Gets a secondary identifier attribute of the component.
   *
   * @param name The name of the secondary identifier attribute to get.
   *
   * @returns A [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance.
   *
   * @example
   * ```
   * movie.getSecondaryIdentifierAttribute('slug'); // => 'slug' secondary identifier attribute
   * movie.getSecondaryIdentifierAttribute('id'); // => Error ('id' is not a secondary identifier attribute)
   * ```
   *
   * @category Attribute Properties
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
   * Returns whether the component has the specified secondary identifier attribute.
   *
   * @param name The name of the secondary identifier attribute to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasSecondaryIdentifierAttribute('slug'); // => true
   * movie.hasSecondaryIdentifierAttribute('name'); // => false (the property 'name' doesn't exist)
   * movie.hasSecondaryIdentifierAttribute('id'); // => Error ('id' is not a secondary identifier attribute)
   * ```
   *
   * @category Attribute Properties
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
   * Defines a secondary identifier attribute in the component. Typically, instead of using this method, you would rather use the [`@secondaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#secondary-identifier-decorator) decorator.
   *
   * @param name The name of the secondary identifier attribute to define.
   * @param [attributeOptions] The options to create the [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).
   *
   * @returns The [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) that was created.
   *
   * @example
   * ```
   * User.prototype.setSecondaryIdentifierAttribute('slug', {valueType: 'string'});
   * ```
   *
   * @category Attribute Properties
   */
  setSecondaryIdentifierAttribute(name: string, attributeOptions: AttributeOptions = {}) {
    return this.setProperty(name, SecondaryIdentifierAttribute, attributeOptions);
  }

  /**
   * Returns an iterator providing the identifier attributes of the component.
   *
   * @param [options.filter] A function used to filter the identifier attributes to be returned. The function is invoked for each identifier attribute with an `IdentifierAttribute` instance as first argument.
   * @param [options.setAttributesOnly] A boolean specifying whether only set identifier attributes should be returned (default: `false`).
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the identifier attributes to be returned (default: `true`, which means that all identifier attributes should be returned).
   *
   * @returns An iterator of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) or [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).
   *
   * @example
   * ```
   * for (const attr of movie.getIdentifierAttributes()) {
   *   console.log(attr.getName());
   * }
   *
   * // Should output:
   * // id
   * // slug
   * ```
   *
   * @category Attribute Properties
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
   * Returns an iterator providing the secondary identifier attributes of the component.
   *
   * @param [options.filter] A function used to filter the secondary identifier attributes to be returned. The function is invoked for each identifier attribute with a [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance as first argument.
   * @param [options.setAttributesOnly] A boolean specifying whether only set secondary identifier attributes should be returned (default: `false`).
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the secondary identifier attributes to be returned (default: `true`, which means that all secondary identifier attributes should be returned).
   *
   * @returns A [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance iterator.
   *
   * @example
   * ```
   * for (const attr of movie.getSecondaryIdentifierAttributes()) {
   *   console.log(attr.getName());
   * }
   *
   * // Should output:
   * // slug
   * ```
   *
   * @category Attribute Properties
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
   * Returns an object composed of all the identifiers that are set in the component. The shape of the returned object is `{[identifierName]: identifierValue}`. Throws an error if the component doesn't have any set identifiers.
   *
   * @returns An object.
   *
   * @example
   * ```
   * movie.getIdentifiers(); // => {id: 'abc123', slug: 'inception'}
   * ```
   *
   * @category Attribute Properties
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
   * Returns whether the component has an identifier that is set or not.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasIdentifiers(); // => true
   * ```
   *
   * @category Attribute Properties
   */
  hasIdentifiers() {
    return this.__getIdentifiers() !== undefined;
  }

  __getIdentifiers() {
    let identifiers: NormalizedIdentifierDescriptor | undefined;

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
   *
   * @example
   * ```
   * Movie.generateId(); // => 'ck41vli1z00013h5xx1esffyn'
   * ```
   *
   * @category Attribute Properties
   */
  static generateId() {
    return cuid();
  }

  __getMinimumAttributeCount() {
    return this.hasPrimaryIdentifierAttribute() ? 1 : 0;
  }

  // === Identifier Descriptor ===

  /**
   * Returns the `IdentifierDescriptor` of the component.
   *
   * An `IdentifierDescriptor` is a plain object composed of one pair of name/value corresponding to the name and value of the first identifier attribute encountered in a component. Usually it is the primary identifier, but if the primary identifier is not set, it can be a secondary identifier.
   *
   * If there is no set identifier in the component, an error is thrown.
   *
   * @returns An object.
   *
   * @example
   * ```
   * movie.getIdentifierDescriptor(); // => {id: 'abc123'}
   * ```
   *
   * @category Identifier Descriptor
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
   * Returns whether the component can provide an `IdentifierDescriptor` (using the [`getIdentifierDescriptor()`](https://layrjs.com/docs/v2/reference/component#get-identifier-descriptor-instance-method) method) or not.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasIdentifierDescriptor(); // => true
   * ```
   *
   * @category Identifier Descriptor
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

  // === Identifier Selector ====

  static normalizeIdentifierSelector(
    identifierSelector: IdentifierSelector
  ): NormalizedIdentifierSelector {
    if (typeof identifierSelector === 'string' || typeof identifierSelector === 'number') {
      const primaryIdentifierAttribute = this.prototype.getPrimaryIdentifierAttribute();
      const name = primaryIdentifierAttribute.getName();
      primaryIdentifierAttribute.checkValue(identifierSelector);

      return {[name]: identifierSelector};
    }

    if (!isPlainObject(identifierSelector)) {
      throw new Error(
        `An identifier selector should be a string, a number, or an object, but received a value of type '${getTypeOf(
          identifierSelector
        )}' (${this.describeComponent()})`
      );
    }

    const attributes = Object.entries(identifierSelector);

    if (attributes.length === 0) {
      throw new Error(
        `An identifier selector should be a string, a number, or a non-empty object, but received an empty object (${this.describeComponent()})`
      );
    }

    const normalizedIdentifierSelector: NormalizedIdentifierSelector = {};

    for (const [name, value] of attributes) {
      const identifierAttribute = this.prototype.getIdentifierAttribute(name);
      identifierAttribute.checkValue(value);
      normalizedIdentifierSelector[name] = value;
    }

    return normalizedIdentifierSelector;
  }

  __createIdentifierSelectorFromObject(object: PlainObject) {
    const identifierSelector: NormalizedIdentifierSelector = {};

    for (const identifierAttribute of this.getIdentifierAttributes({autoFork: false})) {
      const name = identifierAttribute.getName();
      const value: IdentifierValue | undefined = object[name];

      if (value !== undefined) {
        identifierSelector[name] = value;
      }
    }

    return identifierSelector;
  }

  // === Attribute Value Assignment ===

  /**
   * Assigns the specified attribute values to the current component class.
   *
   * @param object An object specifying the attribute values to assign.
   * @param [options.source] A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the attribute values (default: `'local'`).
   *
   * @returns The current component class.
   *
   * @example
   * ```
   * import {Component, attribute} from '﹫layr/component';
   *
   * class Application extends Component {
   *   ﹫attribute('string') static language = 'en';
   * }
   *
   * Application.language // => 'en'
   *
   * Application.assign({language: 'fr'});
   *
   * Application.language // => 'fr'
   * ```
   *
   * @category Attribute Value Assignment
   */
  static assign<T extends typeof Component>(
    this: T,
    object: PlainObject = {},
    options: {
      source?: ValueSource;
    } = {}
  ): T {
    const {source} = options;

    this.__assignAttributes(object, {source});

    return this;
  }

  /**
   * Assigns the specified attribute values to the current component instance.
   *
   * @param object An object specifying the attribute values to assign.
   * @param [options.source] A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the attribute values (default: `'local'`).
   *
   * @returns The current component instance.
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, attribute} from '﹫layr/component';
   *
   * class Movie extends Component {
   *   ﹫attribute('string') title;
   *   ﹫attribute('number') rating;
   * }
   *
   * const movie = new Movie({title: 'Inception', rating: 8.7});
   *
   * movie.title // => 'Inception'
   * movie.rating // => 8.7
   *
   * movie.assign({rating: 8.8});
   *
   * movie.title // => 'Inception'
   * movie.rating // => 8.8
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, attribute} from '﹫layr/component';
   *
   * class Movie extends Component {
   *   ﹫attribute('string') title!: string;
   *   ﹫attribute('number') rating!: number;
   * }
   *
   * const movie = new Movie({title: 'Inception', rating: 8.7});
   *
   * movie.title // => 'Inception'
   * movie.rating // => 8.7
   *
   * movie.assign({rating: 8.8});
   *
   * movie.rating // => 8.8
   * ```
   *
   * @category Attribute Value Assignment
   */
  assign<T extends Component>(
    this: T,
    object: PlainObject = {},
    options: {
      source?: ValueSource;
    } = {}
  ): T {
    const {source} = options;

    this.__assignAttributes(object, {source});

    return this;
  }

  static get __assignAttributes() {
    return this.prototype.__assignAttributes;
  }

  __assignAttributes(object: PlainObject, {source}: {source: ValueSource | undefined}) {
    for (const [name, value] of Object.entries(object)) {
      this.getAttribute(name).setValue(value, {source});
    }
  }

  // === Identity Mapping ===

  static __identityMap: IdentityMap;

  /**
   * Gets the [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map) of the component.
   *
   * @returns An [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map) instance.
   *
   * @category Identity Mapping
   */
  static getIdentityMap() {
    if (this.__identityMap === undefined) {
      Object.defineProperty(this, '__identityMap', {value: new IdentityMap(this)});
    } else if (!hasOwnProperty(this, '__identityMap')) {
      Object.defineProperty(this, '__identityMap', {value: this.__identityMap.fork(this)});
    }

    return this.__identityMap;
  }

  static __isAttached: boolean;

  /**
   * Attaches the component class to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map). By default, all component classes are attached, so unless you have detached a component class earlier, you should not have to use this method.
   *
   * @returns The component class.
   *
   * @category Identity Mapping
   */
  static attach<T extends typeof Component>(this: T) {
    Object.defineProperty(this, '__isAttached', {value: true, configurable: true});

    return this;
  }

  /**
   * Detaches the component class from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).
   *
   * @returns The component class.
   *
   * @category Identity Mapping
   */
  static detach<T extends typeof Component>(this: T) {
    Object.defineProperty(this, '__isAttached', {value: false, configurable: true});

    return this;
  }

  /**
   * Returns whether the component class is attached to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).
   *
   * @returns A boolean.
   *
   * @category Identity Mapping
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
   * Returns whether the component class is detached from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).
   *
   * @returns A boolean.
   *
   * @category Identity Mapping
   */
  static isDetached() {
    return !this.isAttached();
  }

  __isAttached?: boolean;

  /**
   * Attaches the component instance to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map). By default, all component instances are attached, so unless you have detached a component instance earlier, you should not have to use this method.
   *
   * @returns The component instance.
   *
   * @category Identity Mapping
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
   * Detaches the component instance from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).
   *
   * @returns The component instance.
   *
   * @category Identity Mapping
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
   * Returns whether the component instance is attached to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).
   *
   * @returns A boolean.
   *
   * @category Identity Mapping
   */
  isAttached() {
    if (this.__isAttached !== undefined) {
      return this.__isAttached;
    }

    return this.constructor.isAttached();
  }

  /**
   * Returns whether the component instance is detached from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).
   *
   * @returns A boolean.
   *
   * @category Identity Mapping
   */
  isDetached() {
    return !this.isAttached();
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
      (target === 'client' || typeof (this as any).isStorable === 'function');

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
          const valueType = attribute.getValueType();

          const attributeIsReferencedComponent =
            isComponentValueTypeInstance(valueType) &&
            !ensureComponentClass(valueType.getComponent(attribute)).isEmbedded();

          if (!attributeIsReferencedComponent) {
            continue;
          }
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
   * Validates the attributes of the component. If an attribute doesn't pass the validation, an error is thrown. The error is a JavaScript `Error` instance with a `failedValidators` custom attribute which contains the result of the [`runValidators()`](https://layrjs.com/docs/v2/reference/component#run-validators-dual-method) method.
   *
   * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be validated (default: `true`, which means that all the attributes will be validated).
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, attribute, validators} from '﹫layr/component';
   *
   * const {notEmpty} = validators;
   *
   * class Movie extends Component {
   *   ﹫attribute('string', {validators: [notEmpty()]}) title;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.title; // => 'Inception'
   * movie.validate(); // All good!
   * movie.title = '';
   * movie.validate(); // Error {failedValidators: [{validator: ..., path: 'title'}]}
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, attribute, validators} from '﹫layr/component';
   *
   * const {notEmpty} = validators;
   *
   * class Movie extends Component {
   *   ﹫attribute('string', {validators: [notEmpty()]}) title!: string;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.title; // => 'Inception'
   * movie.validate(); // All good!
   * movie.title = '';
   * movie.validate(); // Error {failedValidators: [{validator: ..., path: 'title'}]}
   * ```
   *
   * @category Validation
   */
  static get validate() {
    return this.prototype.validate;
  }

  /**
   * Validates the attributes of the component. If an attribute doesn't pass the validation, an error is thrown. The error is a JavaScript `Error` instance with a `failedValidators` custom attribute which contains the result of the [`runValidators()`](https://layrjs.com/docs/v2/reference/component#run-validators-dual-method) method.
   *
   * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be validated (default: `true`, which means that all the attributes will be validated).
   *
   * @example
   * ```
   * // JS
   *
   * import {Component, attribute, validators} from '﹫layr/component';
   *
   * const {notEmpty} = validators;
   *
   * class Movie extends Component {
   *   ﹫attribute('string', {validators: [notEmpty()]}) title;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.title; // => 'Inception'
   * movie.validate(); // All good!
   * movie.title = '';
   * movie.validate(); // Error {failedValidators: [{validator: ..., path: 'title'}]}
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * import {Component, attribute, validators} from '﹫layr/component';
   *
   * const {notEmpty} = validators;
   *
   * class Movie extends Component {
   *   ﹫attribute('string', {validators: [notEmpty()]}) title!: string;
   * }
   *
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.title; // => 'Inception'
   * movie.validate(); // All good!
   * movie.title = '';
   * movie.validate(); // Error {failedValidators: [{validator: ..., path: 'title'}]}
   * ```
   *
   * @category Validation
   */
  validate(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    let displayMessage: string | undefined;

    for (const {validator} of failedValidators) {
      const message = validator.getMessage({generateIfMissing: false});

      if (message !== undefined) {
        displayMessage = message;
        break;
      }
    }

    throwError(
      `The following error(s) occurred while validating the component '${ensureComponentClass(
        this
      ).getComponentName()}': ${details}`,
      {displayMessage, failedValidators}
    );
  }

  /**
   * Returns whether the attributes of the component are valid.
   *
   * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be checked (default: `true`, which means that all the attributes will be checked).
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * // See the `movie` definition in the `validate()` example
   *
   * movie.title; // => 'Inception'
   * movie.isValid(); // => true
   * movie.title = '';
   * movie.isValid(); // => false
   * ```
   *
   * @category Validation
   */
  static get isValid() {
    return this.prototype.isValid;
  }

  /**
   * Returns whether the attributes of the component are valid.
   *
   * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be checked (default: `true`, which means that all the attributes will be checked).
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * // See the `movie` definition in the `validate()` example
   *
   * movie.title; // => 'Inception'
   * movie.isValid(); // => true
   * movie.title = '';
   * movie.isValid(); // => false
   * ```
   *
   * @category Validation
   */
  isValid(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  /**
   * Runs the validators for all the set attributes of the component.
   *
   * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be validated (default: `true`, which means that all the attributes will be validated).
   *
   * @returns An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a [`Validator`](https://layrjs.com/docs/v2/reference/validator) instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).
   *
   * @example
   * ```
   * // See the `movie` definition in the `validate()` example
   *
   * movie.title; // => 'Inception'
   * movie.runValidators(); // => []
   * movie.title = '';
   * movie.runValidators(); // => [{validator: ..., path: 'title'}]
   * ```
   *
   * @category Validation
   */
  static get runValidators() {
    return this.prototype.runValidators;
  }

  /**
   * Runs the validators for all the set attributes of the component.
   *
   * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be validated (default: `true`, which means that all the attributes will be validated).
   *
   * @returns An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a [`Validator`](https://layrjs.com/docs/v2/reference/validator) instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).
   *
   * @example
   * ```
   * // See the `movie` definition in the `validate()` example
   *
   * movie.title; // => 'Inception'
   * movie.runValidators(); // => []
   * movie.title = '';
   * movie.runValidators(); // => [{validator: ..., path: 'title'}]
   * ```
   *
   * @category Validation
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

  // === Method Properties ===

  /**
   * Gets a method of the component.
   *
   * @param name The name of the method to get.
   *
   * @returns A [`Method`](https://layrjs.com/docs/v2/reference/method) instance.
   *
   * @example
   * ```
   * movie.getMethod('play'); // => 'play' method property
   * movie.getMethod('title'); // => Error ('title' is an attribute property)
   * ```
   *
   * @category Method Properties
   */
  static get getMethod() {
    return this.prototype.getMethod;
  }

  /**
   * Gets a method of the component.
   *
   * @param name The name of the method to get.
   *
   * @returns A [`Method`](https://layrjs.com/docs/v2/reference/method) instance.
   *
   * @example
   * ```
   * movie.getMethod('play'); // => 'play' method property
   * movie.getMethod('title'); // => Error ('title' is an attribute property)
   * ```
   *
   * @category Method Properties
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
   * Returns whether the component has the specified method.
   *
   * @param name The name of the method to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasMethod('play'); // => true
   * movie.hasMethod('destroy'); // => false
   * movie.hasMethod('title'); // => Error ('title' is an attribute property)
   * ```
   *
   * @category Method Properties
   */
  static get hasMethod() {
    return this.prototype.hasMethod;
  }

  /**
   * Returns whether the component has the specified method.
   *
   * @param name The name of the method to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * movie.hasMethod('play'); // => true
   * movie.hasMethod('destroy'); // => false
   * movie.hasMethod('title'); // => Error ('title' is an attribute property)
   * ```
   *
   * @category Method Properties
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
   * Defines a method in the component. Typically, instead of using this method, you would rather use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.
   *
   * @param name The name of the method to define.
   * @param [methodOptions] The options to create the [`Method`](https://layrjs.com/docs/v2/reference/method#constructor).
   *
   * @returns The [`Method`](https://layrjs.com/docs/v2/reference/method) that was created.
   *
   * @example
   * ```
   * Movie.prototype.setMethod('play');
   * ```
   *
   * @category Method Properties
   */
  static get setMethod() {
    return this.prototype.setMethod;
  }

  /**
   * Defines a method in the component. Typically, instead of using this method, you would rather use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.
   *
   * @param name The name of the method to define.
   * @param [methodOptions] The options to create the [`Method`](https://layrjs.com/docs/v2/reference/method#constructor).
   *
   * @returns The [`Method`](https://layrjs.com/docs/v2/reference/method) that was created.
   *
   * @example
   * ```
   * Movie.prototype.setMethod('play');
   * ```
   *
   * @category Method Properties
   */
  setMethod(name: string, methodOptions: MethodOptions = {}) {
    return this.setProperty(name, Method, methodOptions);
  }

  /**
   * Returns an iterator providing the methods of the component.
   *
   * @param [options.filter] A function used to filter the methods to be returned. The function is invoked for each method with a [`Method`](https://layrjs.com/docs/v2/reference/method) instance as first argument.
   *
   * @returns A [`Method`](https://layrjs.com/docs/v2/reference/method) instance iterator.
   *
   * @example
   * ```
   * for (const meth of movie.getMethods()) {
   *   console.log(meth.getName());
   * }
   *
   * // Should output:
   * // play
   * ```
   *
   * @category Method Properties
   */
  static get getMethods() {
    return this.prototype.getMethods;
  }

  /**
   * Returns an iterator providing the methods of the component.
   *
   * @param [options.filter] A function used to filter the methods to be returned. The function is invoked for each method with a [`Method`](https://layrjs.com/docs/v2/reference/method) instance as first argument.
   *
   * @returns A [`Method`](https://layrjs.com/docs/v2/reference/method) instance iterator.
   *
   * @example
   * ```
   * for (const meth of movie.getMethods()) {
   *   console.log(meth.getName());
   * }
   *
   * // Should output:
   * // play
   * ```
   *
   * @category Method Properties
   */
  getMethods(options: {filter?: PropertyFilterSync; autoFork?: boolean} = {}) {
    const {filter, autoFork = true} = options;

    return this.getProperties<Method>({filter, autoFork, methodsOnly: true});
  }

  // === Dependency Management ===

  // --- Component getters ---

  /**
   * Gets a component class that is provided or consumed by the current component. An error is thrown if there is no component matching the specified name. If the specified name is the name of the current component, the latter is returned.
   *
   * @param name The name of the component class to get.
   *
   * @returns A component class.
   *
   * @example
   * ```
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * Application.getComponent('Movie'); // => Movie
   * Application.getComponent('Application'); // => Application
   * ```
   *
   * @category Dependency Management
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
   *
   * @example
   * ```
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * Application.hasComponent('Movie'); // => true
   * Application.hasComponent('Application'); // => true
   * Application.hasComponent('Film'); // => false
   * ```
   *
   * @category Dependency Management
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
   *
   * @example
   * ```
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * Application.getComponentOfType('typeof Movie'); // => Movie
   * Application.getComponentOfType('Movie'); // => Movie.prototype
   * Application.getComponentOfType('typeof Application'); // => Application
   * Application.getComponentOfType('Application'); // => Application.prototype
   * ```
   *
   * @category Dependency Management
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
   *
   * @example
   * ```
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * Application.hasComponentOfType('typeof Movie'); // => true
   * Application.hasComponentOfType('Movie'); // => true
   * Application.hasComponentOfType('typeof Application'); // => true
   * Application.hasComponentOfType('Application'); // => true
   * Application.hasComponentOfType('typeof Film'); // => false
   * Application.hasComponentOfType('Film'); // => false
   * ```
   *
   * @category Dependency Management
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

  static traverseComponents(options: {filter?: (component: typeof Component) => boolean} = {}) {
    const {filter} = options;

    const component = this;

    return {
      *[Symbol.iterator](): Generator<typeof Component> {
        if (filter === undefined || filter(component)) {
          yield component;
        }

        for (const providedComponent of component.getProvidedComponents({deep: true, filter})) {
          yield providedComponent;
        }
      }
    };
  }

  // --- Component provision ---

  /**
   * Gets a component that is provided by the current component. An error is thrown if there is no provided component with the specified name.
   *
   * @param name The name of the provided component to get.
   *
   * @returns A component class.
   *
   * @example
   * ```
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * Application.getProvidedComponent('Movie'); // => Movie
   * ```
   *
   * @category Dependency Management
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
   * Specifies that the current component is providing another component so it can be easily accessed from the current component or from any component that is "consuming" it using the [`consumeComponent()`](https://layrjs.com/docs/v2/reference/component#consume-component-class-method) method or the [`@consume()`](https://layrjs.com/docs/v2/reference/component#consume-decorator) decorator.
   *
   * The provided component can later be accessed using a component accessor that was automatically set on the component provider.
   *
   * Typically, instead of using this method, you would rather use the [`@provide()`]((https://layrjs.com/docs/v2/reference/component#provide-decorator)) decorator.
   *
   * @param component The component class to provide.
   *
   * @example
   * ```
   * class Application extends Component {}
   * class Movie extends Component {}
   * Application.provideComponent(Movie);
   *
   * Application.Movie; // => `Movie` class
   * ```
   *
   * @category Dependency Management
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
   * @param [options.filter] A function used to filter the provided components to be returned. The function is invoked for each provided component with the provided component as first argument.
   * @param [options.deep] A boolean specifying whether the method should get the provided components recursively (i.e., get the provided components of the provided components). Default: `false`.
   *
   * @returns A component iterator.
   *
   * @category Dependency Management
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
   * Returns the provider of the component. If there is no component provider, returns the current component.
   *
   * @returns A component provider.
   *
   * @example
   * ```
   * class Application extends Component {}
   * class Movie extends Component {}
   * Application.provideComponent(Movie);
   *
   * Movie.getComponentProvider(); // => `Application` class
   * Application.getComponentProvider(); // => `Application` class
   * ```
   *
   * @category Dependency Management
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
   * Gets a component that is consumed by the current component. An error is thrown if there is no consumed component with the specified name. Typically, instead of using this method, you would rather use the component accessor that has been automatically set for you.
   *
   * @param name The name of the consumed component to get.
   *
   * @returns A component class.
   *
   * @example
   * ```
   * // JS
   *
   * class Movie extends Component {
   *   ﹫consume() static Actor;
   * }
   *
   * class Actor extends Component {}
   *
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   *   ﹫provide() static Actor = Actor;
   * }
   *
   * Movie.getConsumedComponent('Actor'); // => Actor
   *
   * // Typically, you would rather use the component accessor:
   * Movie.Actor; // => Actor
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * class Movie extends Component {
   *   ﹫consume() static Actor: typeof Actor;
   * }
   *
   * class Actor extends Component {}
   *
   * class Application extends Component {
   *   ﹫provide() static Movie = Movie;
   *   ﹫provide() static Actor = Actor;
   * }
   *
   * Movie.getConsumedComponent('Actor'); // => Actor
   *
   * // Typically, you would rather use the component accessor:
   * Movie.Actor; // => Actor
   * ```
   *
   * @category Dependency Management
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
   * Typically, instead of using this method, you would rather use the [`@consume()`]((https://layrjs.com/docs/v2/reference/component#consume-decorator)) decorator.
   *
   * @param name The name of the component to consume.
   *
   * @example
   * ```
   * class Application extends Component {}
   * class Movie extends Component {}
   * Application.provideComponent(Movie);
   * Movie.consumeComponent('Application');
   *
   * Movie.Application; // => `Application` class
   * ```
   *
   * @category Dependency Management
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
   * @param [options.filter] A function used to filter the consumed components to be returned. The function is invoked for each consumed component with the consumed component as first argument.
   *
   * @returns A component iterator.
   *
   * @category Dependency Management
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
   * Clones the component instance. All primitive attributes are copied, and embedded components are cloned recursively. Currently, identifiable components (i.e., components having an identifier attribute) cannot be cloned, but this might change in the future.
   *
   * @returns A clone of the component.
   *
   * @example
   * ```
   * movie.title = 'Inception';
   *
   * const movieClone = movie.clone();
   * movieClone.title = 'Inception 2';
   *
   * movieClone.title; // => 'Inception 2'
   * movie.title; // => 'Inception'
   * ```
   *
   * @category Cloning
   * @possiblyasync
   */
  clone<T extends Component>(this: T, options: CloneOptions = {}): T {
    if (this.hasPrimaryIdentifierAttribute()) {
      return this;
    }

    const clonedComponent = this.constructor.instantiate() as T;

    clonedComponent.setIsNewMark(this.getIsNewMark());

    for (const attribute of this.getAttributes({setAttributesOnly: true})) {
      const name = attribute.getName();
      const value = attribute.getValue();
      const source = attribute.getValueSource();
      const clonedValue = clone(value, options);
      clonedComponent.getAttribute(name).setValue(clonedValue, {source});
    }

    return clonedComponent;
  }

  // === Forking ===

  /**
   * Creates a fork of the component class.
   *
   * @returns The component class fork.
   *
   * @example
   * ```
   * class Movie extends Component {}
   *
   * Movie.fork(); // => A fork of the `Movie` class
   * ```
   *
   * @category Forking
   */
  static fork<T extends typeof Component>(this: T, options: ForkOptions = {}): T {
    const {componentProvider = this.__getComponentProvider()} = options;

    const name = this.getComponentName();

    // Use a little trick to make sure the generated subclass
    // has the 'name' attribute set properly
    // @ts-ignore
    const {[name]: componentFork} = {[name]: class extends this {}};

    if (componentFork.name !== name) {
      // In case the code has been transpiled by Babel with @babel/plugin-transform-classes,
      // the above trick doesn't work, so let's set the class name manually
      Object.defineProperty(componentFork, 'name', {value: name});
    }

    if (componentProvider !== undefined) {
      componentFork.__setComponentProvider(componentProvider);
    }

    return componentFork;
  }

  /**
   * Creates a fork of the component instance. Note that the constructor of the resulting component will be a fork of the component class.
   *
   * @returns The component instance fork.
   *
   * @example
   * ```
   * class Movie extends Component {}
   * const movie = new Movie();
   *
   * movie.fork(); // => A fork of `movie`
   * movie.fork().constructor.isForkOf(Movie); // => true
   * ```
   *
   * @category Forking
   */
  fork<T extends Component>(this: T, options: ForkOptions = {}) {
    let {componentClass} = options;

    if (componentClass === undefined) {
      componentClass = this.constructor.fork();
    } else {
      assertIsComponentClass(componentClass);
    }

    const componentFork = Object.create(this) as T;

    if (this.constructor !== componentClass) {
      // Make 'componentFork' believe that it is an instance of 'Component'
      // It can happen when a referenced component is forked
      Object.defineProperty(componentFork, 'constructor', {
        value: componentClass,
        writable: true,
        enumerable: false,
        configurable: true
      });

      if (componentFork.hasPrimaryIdentifierAttribute() && componentFork.isAttached()) {
        componentClass.getIdentityMap().addComponent(componentFork);
      }
    }

    return componentFork;
  }

  /**
   * Returns whether the component class is a fork of another component class.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * class Movie extends Component {}
   * const MovieFork = Movie.fork();
   *
   * MovieFork.isForkOf(Movie); // => true
   * Movie.isForkOf(MovieFork); // => false
   * ```
   *
   * @category Forking
   */
  static isForkOf(component: typeof Component) {
    assertIsComponentClass(component);

    return isPrototypeOf(component, this);
  }

  /**
   * Returns whether the component instance is a fork of another component instance.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * class Movie extends Component {}
   * const movie = new Movie();
   * const movieFork = movie.fork();
   *
   * movieFork.isForkOf(movie); // => true
   * movie.isForkOf(movieFork); // => false
   * ```
   *
   * @category Forking
   */
  isForkOf(component: Component) {
    assertIsComponentInstance(component);

    return isPrototypeOf(component, this);
  }

  static __ghost: typeof Component;

  /**
   * Gets the ghost of the component class. A ghost is like a fork, but it is unique. The first time you call this method, a fork is created, and then, all the successive calls return the same fork.
   *
   * @returns The ghost of the component class.
   *
   * @example
   * ```
   * class Movie extends Component {}
   *
   * Movie.getGhost() // => A fork of the `Movie` class
   * Movie.getGhost() // => The same fork of the `Movie` class
   * ```
   *
   * @category Forking
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
   * Gets the ghost of the component instance. A ghost is like a fork, but it is unique. The first time you call this method, a fork is created, and then, all the successive calls return the same fork. Only identifiable components (i.e., components having an identifier attribute) can be "ghosted".
   *
   * @returns The ghost of the component instance.
   *
   * @example
   * ```
   * // JS
   *
   * class Movie extends Component {
   *   ﹫primaryIdentifier() id;
   * }
   *
   * const movie = new Movie();
   *
   * movie.getGhost() // => A fork of `movie`
   * movie.getGhost() // => The same fork of `movie`
   * ```
   *
   * @example
   * ```
   * // TS
   *
   * class Movie extends Component {
   *   ﹫primaryIdentifier() id!: string;
   * }
   *
   * const movie = new Movie();
   *
   * movie.getGhost() // => A fork of `movie`
   * movie.getGhost() // => The same fork of `movie`
   * ```
   *
   * @category Forking
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
   * @param componentFork The component class fork to merge.
   *
   * @returns The current component class.
   *
   * @example
   * ```
   * class Movie extends Component {
   *   ﹫attribute('string') static customName = 'Movie';
   * }
   *
   * const MovieFork = Movie.fork();
   * MovieFork.customName = 'Film';
   *
   * Movie.customName; // => 'Movie'
   * Movie.merge(MovieFork);
   * Movie.customName; // => 'Film'
   * ```
   *
   * @category Merging
   */
  static merge<T extends typeof Component>(
    this: T,
    componentFork: typeof Component,
    options: MergeOptions & {attributeSelector?: AttributeSelector} = {}
  ) {
    assertIsComponentClass(componentFork);

    if (!isPrototypeOf(this, componentFork)) {
      throw new Error('Cannot merge a component that is not a fork of the target component');
    }

    this.__mergeAttributes(componentFork, options);

    return this;
  }

  /**
   * Merges the attributes of a component instance fork into the current component instance.
   *
   * @param componentFork The component instance fork to merge.
   *
   * @returns The current component instance.
   *
   * @example
   * ```
   * const movie = new Movie({title: 'Inception'});
   * const movieFork = movie.fork();
   * movieFork.title = 'Inception 2';
   *
   * movie.title; // => 'Inception'
   * movie.merge(movieFork);
   * movie.title; // => 'Inception 2'
   * ```
   *
   * @category Merging
   */
  merge(
    componentFork: Component,
    options: MergeOptions & {attributeSelector?: AttributeSelector} = {}
  ) {
    assertIsComponentInstance(componentFork);

    if (!isPrototypeOf(this, componentFork)) {
      throw new Error('Cannot merge a component that is not a fork of the target component');
    }

    this.__mergeAttributes(componentFork, options);

    return this;
  }

  static get __mergeAttributes() {
    return this.prototype.__mergeAttributes;
  }

  __mergeAttributes(
    componentFork: typeof Component | Component,
    {attributeSelector, ...otherOptions}: MergeOptions & {attributeSelector?: AttributeSelector}
  ) {
    for (const attributeFork of componentFork.getAttributes({attributeSelector})) {
      const name = attributeFork.getName();

      const attribute = this.getAttribute(name);

      if (!attributeFork.isSet()) {
        if (attribute.isSet()) {
          attribute.unsetValue();
        }

        continue;
      }

      const valueFork = attributeFork.getValue();
      const value = attribute.getValue({throwIfUnset: false});

      const mergedValue = merge(value, valueFork, otherOptions);

      attribute.setValue(mergedValue, {source: attributeFork.getValueSource()});
    }
  }

  // === Serialization ===

  /**
   * Serializes the component class to a plain object.
   *
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be serialized (default: `true`, which means that all the attributes will be serialized).
   * @param [options.attributeFilter] A (possibly async) function used to filter the attributes to be serialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
   * @param [options.target] A string specifying the [target](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `undefined`).
   *
   * @returns A plain object representing the serialized component class.
   *
   * @example
   * ```
   * class Movie extends Component {
   *   ﹫attribute('string') static customName = 'Film';
   * }
   *
   * Movie.serialize(); // => {__component: 'typeof Movie', customName: 'Film'}
   * ```
   *
   * @category Serialization
   * @possiblyasync
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
   * Serializes the component instance to a plain object.
   *
   * @param [options.attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be serialized (default: `true`, which means that all the attributes will be serialized).
   * @param [options.attributeFilter] A (possibly async) function used to filter the attributes to be serialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
   * @param [options.target] A string specifying the [target](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `undefined`).
   *
   * @returns A plain object representing the serialized component instance.
   *
   * @example
   * ```
   * const movie = new Movie({title: 'Inception'});
   *
   * movie.serialize(); // => {__component: 'Movie', title: 'Inception'}
   * ```
   *
   * @category Serialization
   * @possiblyasync
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
      includeReferencedComponents
    } = options;

    const serializedComponent: PlainObject = {};

    if (includeComponentTypes) {
      serializedComponent.__component = this.getComponentType();
    }

    const isEmbedded = this.constructor.isEmbedded();

    if (!isEmbedded) {
      const hasAlreadyBeenSerialized = serializedComponents!.has(this);

      if (!hasAlreadyBeenSerialized) {
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

      serializedComponents!.add(this);
    }

    const isNew = this.getIsNewMark();

    if (isNew && includeIsNewMarks) {
      serializedComponent.__new = true;
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
   * Deserializes the component class from the specified plain object. The deserialization operates "in place", which means that the current component class attributes are mutated.
   *
   * @param [object] The plain object to deserialize from.
   * @param [options.attributeFilter] A (possibly async) function used to filter the attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
   * @param [options.source] A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `'local'`).
   *
   * @returns The component class.
   *
   * @example
   * ```
   * class Movie extends Component {
   *   ﹫attribute('string') static customName = 'Movie';
   * }
   *
   * Movie.customName; // => 'Movie'
   * Movie.deserialize({customName: 'Film'});
   * Movie.customName; // => 'Film'
   * ```
   *
   * @category Deserialization
   * @possiblyasync
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

    return possiblyAsync(this.__deserializeAttributes(attributes, options), () => this);
  }

  /**
   * Deserializes the component instance from the specified plain object. The deserialization operates "in place", which means that the current component instance attributes are mutated.
   *
   * @param [object] The plain object to deserialize from.
   * @param [options.attributeFilter] A (possibly async) function used to filter the attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
   * @param [options.source] A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `'local'`).
   *
   * @returns The current component instance.
   *
   * @example
   * ```
   * class Movie extends Component {
   *   ﹫attribute('string') title = '';
   * }
   *
   * const movie = new Movie();
   *
   * movie.title; // => ''
   * movie.deserialize({title: 'Inception'});
   * movie.title; // => 'Inception'
   * ```
   *
   * @category Deserialization
   * @possiblyasync
   */
  deserialize<T extends Component>(
    this: T,
    object: PlainObject = {},
    options: DeserializeOptions = {}
  ): T | PromiseLike<T> {
    const {deserializedComponents} = options;

    const {__component: componentType, __new: isNew = false, ...attributes} = object;

    if (componentType !== undefined) {
      const expectedComponentType = this.getComponentType();

      if (componentType !== expectedComponentType) {
        throw new Error(
          `An unexpected component type was encountered while deserializing an object (encountered type: '${componentType}', expected type: '${expectedComponentType}')`
        );
      }
    }

    if (isNew && !this.getIsNewMark()) {
      throw new Error(
        `Cannot mark as new an existing non-new component (${this.describeComponent()})`
      );
    }

    this.setIsNewMark(isNew);

    if (deserializedComponents !== undefined && !this.constructor.isEmbedded()) {
      deserializedComponents.add(this);
    }

    return possiblyAsync(this.__deserializeAttributes(attributes, options), () => this);
  }

  static get __deserializeAttributes() {
    return this.prototype.__deserializeAttributes;
  }

  __deserializeAttributes(
    serializedAttributes: PlainObject,
    options: DeserializeOptions
  ): void | PromiseLike<void> {
    const {attributeFilter} = options;

    return possiblyAsync.forEach(
      Object.entries(serializedAttributes),
      ([attributeName, serializedAttributeValue]: [string, unknown]) => {
        const attribute = this.getAttribute(attributeName);

        return possiblyAsync(
          attributeFilter !== undefined ? attributeFilter.call(this, attribute) : true,
          (isNotFilteredOut) => {
            if (isNotFilteredOut) {
              return attribute.deserialize(serializedAttributeValue, options);
            }
          }
        );
      }
    );
  }

  // === Execution mode ===

  static __executionMode: ExecutionMode;

  static getExecutionMode() {
    let currentComponent = this;

    while (true) {
      const executionMode = currentComponent.__executionMode;

      if (executionMode !== undefined) {
        return executionMode;
      }

      const componentProvider = currentComponent.getComponentProvider();

      if (componentProvider === currentComponent) {
        return 'foreground';
      }

      currentComponent = componentProvider;
    }
  }

  static setExecutionMode(executionMode: ExecutionMode) {
    Object.defineProperty(this, '__executionMode', {value: executionMode});
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

// The following would be better defined inside the Component class
// but it leads to a TypeScript (4.3) compilation error in transient dependencies
Object.defineProperty(Component, Symbol.hasInstance, {
  value: function (instance: any) {
    // Since fork() can change the constructor of the instance forks,
    // we must change the behavior of 'instanceof' so it can work as expected
    return instance.constructor === this || isPrototypeOf(this, instance.constructor);
  }
});

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
