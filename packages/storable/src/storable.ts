import {
  Component,
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  isComponentValueTypeInstance,
  Attribute,
  ValueType,
  isArrayValueTypeInstance,
  AttributeSelector,
  createAttributeSelectorFromAttributes,
  attributeSelectorsAreEqual,
  mergeAttributeSelectors,
  removeFromAttributeSelector,
  traverseAttributeSelector,
  trimAttributeSelector,
  normalizeAttributeSelector,
  IdentifierDescriptor,
  IdentifierValue,
  method
} from '@layr/component';
import {hasOwnProperty, isPrototypeOf, isPlainObject, getTypeOf, Constructor} from 'core-helpers';
import mapKeys from 'lodash/mapKeys';

import {
  StorableProperty,
  StorablePropertyOptions,
  isStorablePropertyInstance,
  StorableAttribute,
  StorableAttributeOptions,
  isStorableAttributeInstance,
  StorablePrimaryIdentifierAttribute,
  StorableSecondaryIdentifierAttribute,
  StorableAttributeHookName,
  StorableMethod,
  StorableMethodOptions,
  isStorableMethodInstance
} from './properties';
import {Index, IndexAttributes, IndexOptions} from './index-class';
import type {Query} from './query';
import type {StoreLike} from './store-like';
import {
  isStorableInstance,
  isStorableClassOrInstance,
  ensureStorableClass,
  isStorable
} from './utilities';

export type SortDescriptor = {[name: string]: SortDirection};

export type SortDirection = 'asc' | 'desc';

/**
 * Extends a [`Component`](https://layrjs.com/docs/v2/reference/component) class with some storage capabilities.
 *
 * #### Usage
 *
 * The `Storable()` mixin can be used both in the backend and the frontend.
 *
 * ##### Backend Usage
 *
 * Call `Storable()` with a [`Component`](https://layrjs.com/docs/v2/reference/component) class to construct a [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) class that you can extend with your data model and business logic. Then, register this class into a store such as [`MongoDBStore`](https://layrjs.com/docs/v2/reference/mongodb-store) by using the [`registerStorable()`](https://layrjs.com/docs/v2/reference/store#register-storable-instance-method) method (or [`registerRootComponent()`](https://layrjs.com/docs/v2/reference/store#register-root-component-instance-method) to register several components at once).
 *
 * **Example:**
 *
 * ```js
 * // JS
 *
 * import {Component} from '@layr/component';
 * import {Storable, primaryIdentifier, attribute} from '@layr/storable';
 * import {MongoDBStore} from '@layr/mongodb-store';
 *
 * export class Movie extends Storable(Component) {
 *   @primaryIdentifier() id;
 *
 *   @attribute() title = '';
 * }
 *
 * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
 *
 * store.registerStorable(Movie);
 * ```
 *
 * ```ts
 * // TS
 *
 * import {Component} from '@layr/component';
 * import {Storable, primaryIdentifier, attribute} from '@layr/storable';
 * import {MongoDBStore} from '@layr/mongodb-store';
 *
 * export class Movie extends Storable(Component) {
 *   @primaryIdentifier() id!: string;
 *
 *   @attribute() title = '';
 * }
 *
 * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
 *
 * store.registerStorable(Movie);
 * ```
 *
 * Once you have a storable component registered into a store, you can use any method provided by the `Storable()` mixin to interact with the database:
 *
 * ```
 * const movie = new Movie({id: 'abc123', title: 'Inception'});
 *
 * // Save the movie to the database
 * await movie.save();
 *
 * // Retrieve the movie from the database
 * await Movie.get('abc123'); // => movie
 * ```
 *
 * ##### Frontend Usage
 *
 * Typically, you construct a storable component in the frontend by "inheriting" a storable component exposed by the backend. To accomplish that, you create a [`ComponentHTTPClient`](https://layrjs.com/docs/v2/reference/component-http-client), and then call the [`getComponent()`](https://layrjs.com/docs/v2/reference/component-http-client#get-component-instance-method) method to construct your frontend component.
 *
 * **Example:**
 *
 * ```
 * import {ComponentHTTPClient} from '@layr/component-http-client';
 * import {Storable} from '@layr/storable';
 *
 * (async () => {
 *   const client = new ComponentHTTPClient('https://...', {
 *     mixins: [Storable]
 *   });
 *
 *   const Movie = await client.getComponent();
 * })();
 * ```
 *
 * > Note that you have to pass the `Storable` mixin when you create a `ComponentHTTPClient` that is consuming a storable component.
 *
 * Once you have a storable component in the frontend, you can use any method that is exposed by the backend. For example, if the `Movie`'s [`save()`](https://layrjs.com/docs/v2/reference/storable#save-instance-method) method is exposed by the backend, you can call it from the frontend to add a new movie into the database:
 *
 * ```
 * const movie = new Movie({title: 'Inception 2'});
 *
 * await movie.save();
 * ```
 *
 * See the ["Storing Data"](https://layrjs.com/docs/v2/introduction/data-storage) guide for a comprehensive example using the `Storable()` mixin.
 *
 * ### StorableComponent <badge type="primary">class</badge> {#storable-component-class}
 *
 * *Inherits from [`Component`](https://layrjs.com/docs/v2/reference/component).*
 *
 * A `StorableComponent` class is constructed by calling the `Storable()` mixin ([see above](https://layrjs.com/docs/v2/reference/storable#storable-mixin)).
 *
 * @mixin
 */
export function Storable<T extends Constructor<typeof Component>>(Base: T) {
  if (!isComponentClass(Base)) {
    throw new Error(
      `The Storable mixin should be applied on a component class (received type: '${getTypeOf(
        Base
      )}')`
    );
  }

  if (typeof (Base as any).isStorable === 'function') {
    return Base as T & typeof Storable;
  }

  class Storable extends Base {
    ['constructor']: typeof StorableComponent;

    // === Component Methods ===

    /**
     * See the methods that are inherited from the [`Component`](https://layrjs.com/docs/v2/reference/component#creation) class.
     *
     * @category Component Methods
     */

    // === Store registration ===

    static __store: StoreLike | undefined;

    /**
     * Returns the store in which the storable component is registered. If the storable component is not registered in a store, an error is thrown.
     *
     * @returns A [`Store`](https://layrjs.com/docs/v2/reference/store) instance.
     *
     * @example
     * ```
     * Movie.getStore(); // => store
     * ```
     *
     * @category Store Registration
     */
    static getStore() {
      const store = this.__store;

      if (store === undefined) {
        throw new Error(
          `Cannot get the store of a storable component that is not registered (${this.describeComponent()})`
        );
      }

      return store;
    }

    /**
     * Returns whether the storable component is registered in a store.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * Movie.hasStore(); // => true
     * ```
     *
     * @category Store Registration
     */
    static hasStore() {
      return this.__store !== undefined;
    }

    static __setStore(store: StoreLike) {
      Object.defineProperty(this, '__store', {value: store});
    }

    // === Storable properties ===

    static getPropertyClass(type: string) {
      if (type === 'StorableAttribute') {
        return StorableAttribute;
      }

      if (type === 'StorablePrimaryIdentifierAttribute') {
        return StorablePrimaryIdentifierAttribute;
      }

      if (type === 'StorableSecondaryIdentifierAttribute') {
        return StorableSecondaryIdentifierAttribute;
      }

      if (type === 'StorableMethod') {
        return StorableMethod;
      }

      return super.getPropertyClass(type);
    }

    static get getStorableProperty() {
      return this.prototype.getStorableProperty;
    }

    getStorableProperty(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const property = this.__getStorableProperty(name, {autoFork});

      if (property === undefined) {
        throw new Error(`The storable property '${name}' is missing (${this.describeComponent()})`);
      }

      return property;
    }

    static get hasStorableProperty() {
      return this.prototype.hasStorableProperty;
    }

    hasStorableProperty(name: string) {
      return this.__getStorableProperty(name, {autoFork: false}) !== undefined;
    }

    static get __getStorableProperty() {
      return this.prototype.__getStorableProperty;
    }

    __getStorableProperty(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isStorablePropertyInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a storable property (${property.describe()})`
        );
      }

      return property;
    }

    static get setStorableProperty() {
      return this.prototype.setStorableProperty;
    }

    setStorableProperty(name: string, propertyOptions: StorablePropertyOptions = {}) {
      return this.setProperty(name, StorableProperty, propertyOptions);
    }

    getStorablePropertiesWithFinder() {
      return this.getProperties<StorableProperty>({
        filter: (property) => isStorablePropertyInstance(property) && property.hasFinder()
      });
    }

    // === Storable attributes ===

    static get getStorableAttribute() {
      return this.prototype.getStorableAttribute;
    }

    getStorableAttribute(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const attribute = this.__getStorableAttribute(name, {autoFork});

      if (attribute === undefined) {
        throw new Error(
          `The storable attribute '${name}' is missing (${this.describeComponent()})`
        );
      }

      return attribute;
    }

    static get hasStorableAttribute() {
      return this.prototype.hasStorableAttribute;
    }

    hasStorableAttribute(name: string) {
      return this.__getStorableAttribute(name, {autoFork: false}) !== undefined;
    }

    static get __getStorableAttribute() {
      return this.prototype.__getStorableAttribute;
    }

    __getStorableAttribute(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isStorableAttributeInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a storable attribute (${property.describe()})`
        );
      }

      return property;
    }

    static get setStorableAttribute() {
      return this.prototype.setStorableAttribute;
    }

    setStorableAttribute(name: string, attributeOptions: StorableAttributeOptions = {}) {
      return this.setProperty(name, StorableAttribute, attributeOptions);
    }

    getStorableAttributesWithLoader(
      options: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
    ) {
      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes<StorableAttribute>({
        filter: (attribute) => isStorableAttributeInstance(attribute) && attribute.hasLoader(),
        attributeSelector,
        setAttributesOnly
      });
    }

    getStorableComputedAttributes(
      options: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
    ) {
      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes<StorableAttribute>({
        filter: (attribute) => isStorableAttributeInstance(attribute) && attribute.isComputed(),
        attributeSelector,
        setAttributesOnly
      });
    }

    getStorableAttributesWithHook(
      name: StorableAttributeHookName,
      options: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
    ) {
      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes<StorableAttribute>({
        filter: (attribute) => isStorableAttributeInstance(attribute) && attribute.hasHook(name),
        attributeSelector,
        setAttributesOnly
      });
    }

    async __callStorableAttributeHooks(
      name: StorableAttributeHookName,
      {
        attributeSelector,
        setAttributesOnly
      }: {attributeSelector: AttributeSelector; setAttributesOnly?: boolean}
    ) {
      for (const attribute of this.getStorableAttributesWithHook(name, {
        attributeSelector,
        setAttributesOnly
      })) {
        await attribute.callHook(name);
      }
    }

    // === Indexes ===

    getIndex(attributes: IndexAttributes, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const index = this.__getIndex(attributes, {autoFork});

      if (index === undefined) {
        throw new Error(
          `The index \`${JSON.stringify(attributes)}\` is missing (${this.describeComponent()})`
        );
      }

      return index;
    }

    hasIndex(attributes: IndexAttributes) {
      return this.__getIndex(attributes, {autoFork: false}) !== undefined;
    }

    __getIndex(attributes: IndexAttributes, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const indexes = this.__getIndexes();
      const key = Index._buildIndexKey(attributes);

      let index = indexes[key];

      if (index === undefined) {
        return undefined;
      }

      if (autoFork && index.getParent() !== this) {
        index = index.fork(this);
        indexes[key] = index;
      }

      return index;
    }

    setIndex(attributes: IndexAttributes, options: IndexOptions = {}): Index {
      let index = this.hasIndex(attributes) ? this.getIndex(attributes) : undefined;

      if (index === undefined) {
        index = new Index(attributes, this, options);
        const indexes = this.__getIndexes();
        const key = Index._buildIndexKey(attributes);
        indexes[key] = index;
      } else {
        index.setOptions(options);
      }

      return index;
    }

    deleteIndex(attributes: IndexAttributes) {
      const indexes = this.__getIndexes();
      const key = Index._buildIndexKey(attributes);

      if (!hasOwnProperty(indexes, key)) {
        return false;
      }

      delete indexes[key];

      return true;
    }

    getIndexes(
      options: {
        autoFork?: boolean;
      } = {}
    ) {
      const {autoFork = true} = options;

      const storable = this;

      return {
        *[Symbol.iterator]() {
          const indexes = storable.__getIndexes({autoCreateOrFork: false});

          if (indexes !== undefined) {
            for (const key in indexes) {
              const attributes = indexes[key].getAttributes();

              const index = storable.getIndex(attributes, {autoFork});

              yield index;
            }
          }
        }
      };
    }

    __indexes?: {[name: string]: Index};

    __getIndexes({autoCreateOrFork = true} = {}) {
      if (autoCreateOrFork) {
        if (!('__indexes' in this)) {
          Object.defineProperty(this, '__indexes', {value: Object.create(null)});
        } else if (!hasOwnProperty(this, '__indexes')) {
          Object.defineProperty(this, '__indexes', {value: Object.create(this.__indexes!)});
        }
      }

      return this.__indexes!;
    }

    // === Storable methods ===

    static get getStorableMethod() {
      return this.prototype.getStorableMethod;
    }

    getStorableMethod(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const method = this.__getStorableMethod(name, {autoFork});

      if (method === undefined) {
        throw new Error(`The storable method '${name}' is missing (${this.describeComponent()})`);
      }

      return method;
    }

    static get hasStorableMethod() {
      return this.prototype.hasStorableMethod;
    }

    hasStorableMethod(name: string) {
      return this.__getStorableMethod(name, {autoFork: false}) !== undefined;
    }

    static get __getStorableMethod() {
      return this.prototype.__getStorableMethod;
    }

    __getStorableMethod(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isStorableMethodInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a storable method (${property.describe()})`
        );
      }

      return property;
    }

    static get setStorableMethod() {
      return this.prototype.setStorableMethod;
    }

    setStorableMethod(name: string, methodOptions: StorableMethodOptions = {}) {
      return this.setProperty(name, StorableMethod, methodOptions);
    }

    // === Operations ===

    /**
     * Retrieves a storable component instance (and possibly, some of its referenced components) from the store.
     *
     * > This method uses the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method under the hood to load the component's attributes. So if you want to expose the [`get()`](https://layrjs.com/docs/v2/reference/storable#get-class-method) method to the frontend, you will typically have to expose the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method as well.
     *
     * @param identifier A plain object specifying the identifier of the component you want to retrieve. The shape of the object should be `{[identifierName]: identifierValue}`. Alternatively, you can specify a string or a number representing the value of a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).
     * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
     * @param [options.reload] A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
     * @param [options.throwIfMissing] A boolean specifying whether an error should be thrown if there is no component matching the specified `identifier` in the store (default: `true`).
     *
     * @returns A [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.
     *
     * @example
     * ```
     * // Fully retrieve a movie by its primary identifier
     * await Movie.get({id: 'abc123'});

     * // Same as above, but in a short manner
     * await Movie.get('abc123');
     *
     * // Fully retrieve a movie by its secondary identifier
     * await Movie.get({slug: 'inception'});
     *
     * // Partially retrieve a movie by its primary identifier
     * await Movie.get({id: 'abc123'}, {title: true, rating: true});
     *
     * // Partially retrieve a movie, and fully retrieve its referenced director component
     * await Movie.get({id: 'abc123'}, {title: true, director: true});
     *
     * // Partially retrieve a movie, and partially retrieve its referenced director component
     * await Movie.get({id: 'abc123'}, {title: true, director: {fullName: true}});
     * ```
     *
     * @category Storage Operations
     */
    static async get<T extends typeof StorableComponent>(
      this: T,
      identifierDescriptor: IdentifierDescriptor,
      attributeSelector: AttributeSelector | undefined,
      options: {reload?: boolean; throwIfMissing: false; _callerMethodName?: string}
    ): Promise<InstanceType<T> | undefined>;
    static async get<T extends typeof StorableComponent>(
      this: T,
      identifierDescriptor: IdentifierDescriptor,
      attributeSelector?: AttributeSelector,
      options?: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string}
    ): Promise<InstanceType<T>>;
    @method() static async get<T extends typeof StorableComponent>(
      this: T,
      identifierDescriptor: IdentifierDescriptor,
      attributeSelector: AttributeSelector = true,
      options: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string} = {}
    ) {
      identifierDescriptor = this.normalizeIdentifierDescriptor(identifierDescriptor);
      attributeSelector = normalizeAttributeSelector(attributeSelector);

      const {reload = false, throwIfMissing = true, _callerMethodName} = options;

      let storable = this.getIdentityMap().getComponent(identifierDescriptor) as
        | InstanceType<T>
        | undefined;

      const hasPrimaryIdentifier =
        storable?.getPrimaryIdentifierAttribute().isSet() ||
        this.prototype.getPrimaryIdentifierAttribute().getName() in identifierDescriptor;

      if (!hasPrimaryIdentifier) {
        if (this.hasStore()) {
          // Nothing to do, the storable will be loaded by load()
        } else if (this.hasRemoteMethod('get')) {
          // Let's fetch the primary identifier
          storable = await this.callRemoteMethod(
            'get',
            identifierDescriptor,
            {},
            {
              reload,
              throwIfMissing
            }
          );

          if (storable === undefined) {
            return;
          }
        } else {
          throw new Error(
            `To be able to execute the get() method${describeCaller(
              _callerMethodName
            )} with a secondary identifier, a storable component should be registered in a store or have an exposed get() remote method (${this.describeComponent()})`
          );
        }
      }

      let storableHasBeenCreated = false;

      if (storable === undefined) {
        storable = this.instantiate(identifierDescriptor);
        storableHasBeenCreated = true;
      }

      const loadedStorable = await storable.load(attributeSelector, {
        reload,
        throwIfMissing,
        _callerMethodName: _callerMethodName ?? 'get'
      });

      if (loadedStorable === undefined && storableHasBeenCreated && storable.isAttached()) {
        storable.detach();
      }

      return loadedStorable;
    }

    /**
     * Returns whether a storable component instance exists in the store.
     *
     * @param identifier A plain object specifying the identifier of the component you want to search. The shape of the object should be `{[identifierName]: identifierValue}`. Alternatively, you can specify a string or a number representing the value of a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).
     * @param [options.reload] A boolean specifying whether a component that has already been loaded should be searched again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * // Check if there is a movie with a certain primary identifier
     * await Movie.has({id: 'abc123'}); // => true
     *
     * // Same as above, but in a short manner
     * await Movie.has('abc123'); // => true
     *
     * // Check if there is a movie with a certain secondary identifier
     * await Movie.has({slug: 'inception'}); // => true
     * ```
     *
     * @category Storage Operations
     */
    static async has(identifierDescriptor: IdentifierDescriptor, options: {reload?: boolean} = {}) {
      const {reload = false} = options;

      const storable: StorableComponent | undefined = await this.get(
        identifierDescriptor,
        {},
        {reload, throwIfMissing: false, _callerMethodName: 'has'}
      );

      return storable !== undefined;
    }

    /**
     * Loads some attributes of the current storable component instance (and possibly, some of its referenced components) from the store.
     *
     * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
     * @param [options.reload] A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
     * @param [options.throwIfMissing] A boolean specifying whether an error should be thrown if there is no matching component in the store (default: `true`).
     *
     * @returns The current [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.
     *
     * @example
     * ```
     * // Retrieve a movie with the 'title' attribute only
     * const movie = await Movie.get('abc123', {title: true});
     *
     * // Load a few more movie's attributes
     * await movie.load({tags: true, rating: true});
     *
     * // Load some attributes of the movie's director
     * await movie.load({director: {fullName: true}});
     *
     * // Since the movie's rating has already been loaded,
     * // it will not be loaded again from the store
     * await movie.load({rating: true});
     *
     * // Change the movie's rating
     * movie.rating = 8.5;
     *
     * // Since the movie's rating has been modified,
     * // it will be loaded again from the store
     * await movie.load({rating: true});
     *
     * // Force reloading the movie's rating
     * await movie.load({rating: true}, {reload: true});
     * ```
     *
     * @category Storage Operations
     */
    async load<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector | undefined,
      options: {reload?: boolean; throwIfMissing: false; _callerMethodName?: string}
    ): Promise<T | undefined>;
    async load<T extends StorableComponent>(
      this: T,
      attributeSelector?: AttributeSelector,
      options?: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string}
    ): Promise<T>;
    @method() async load<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector = true,
      options: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string} = {}
    ) {
      const {reload = false, throwIfMissing = true, _callerMethodName} = options;

      if (this.isNew()) {
        throw new Error(
          `Cannot load a storable component that is marked as new (${this.describeComponent()})`
        );
      }

      let resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector);

      if (!reload) {
        const alreadyLoadedAttributeSelector = this.resolveAttributeSelector(
          resolvedAttributeSelector,
          {
            filter: (attribute: Attribute) =>
              attribute.getValueSource() === 'backend' || attribute.getValueSource() === 'store',
            setAttributesOnly: true,
            aggregationMode: 'intersection'
          }
        );

        resolvedAttributeSelector = removeFromAttributeSelector(
          resolvedAttributeSelector,
          alreadyLoadedAttributeSelector
        );
      }

      const computedAttributes = this.getStorableComputedAttributes({
        attributeSelector: resolvedAttributeSelector
      });

      let nonComputedAttributeSelector = removeFromAttributeSelector(
        resolvedAttributeSelector,
        createAttributeSelectorFromAttributes(computedAttributes)
      );

      nonComputedAttributeSelector = trimAttributeSelector(nonComputedAttributeSelector);

      let loadedStorable: T | undefined;

      if (nonComputedAttributeSelector !== false) {
        await this.beforeLoad(nonComputedAttributeSelector);

        const constructor = this.constructor as typeof StorableComponent;

        if (constructor.hasStore()) {
          loadedStorable = (await constructor.getStore().load(this, {
            attributeSelector: nonComputedAttributeSelector,
            throwIfMissing
          })) as T;
        } else if (this.hasRemoteMethod('load')) {
          if (this.getPrimaryIdentifierAttribute().isSet()) {
            loadedStorable = await this.callRemoteMethod('load', nonComputedAttributeSelector, {
              reload,
              throwIfMissing
            });
          } else if (this.constructor.hasRemoteMethod('get')) {
            loadedStorable = await this.constructor.callRemoteMethod(
              'get',
              this.getIdentifierDescriptor(),
              nonComputedAttributeSelector,
              {
                reload,
                throwIfMissing
              }
            );
          } else {
            throw new Error(
              `To be able to execute the load() method${describeCaller(
                _callerMethodName
              )} when no primary identifier is set, a storable component should be registered in a store or have an exposed get() remote method (${this.constructor.describeComponent()})`
            );
          }
        } else {
          throw new Error(
            `To be able to execute the load() method${describeCaller(
              _callerMethodName
            )}, a storable component should be registered in a store or have an exposed load() remote method (${this.describeComponent()})`
          );
        }

        if (loadedStorable === undefined) {
          return undefined;
        }

        await loadedStorable.afterLoad(nonComputedAttributeSelector);
      } else {
        loadedStorable = this; // OPTIMIZATION: There was nothing to load
      }

      for (const attribute of loadedStorable.getStorableAttributesWithLoader({
        attributeSelector: resolvedAttributeSelector
      })) {
        const value = await attribute.callLoader();
        attribute.setValue(value, {source: 'store'});
      }

      await loadedStorable.__populate(attributeSelector, {
        reload,
        throwIfMissing,
        _callerMethodName
      });

      return loadedStorable;
    }

    async __populate(
      attributeSelector: AttributeSelector,
      {
        reload,
        throwIfMissing,
        _callerMethodName
      }: {reload: boolean; throwIfMissing: boolean; _callerMethodName: string | undefined}
    ) {
      const resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
        includeReferencedComponents: true
      });

      const storablesWithAttributeSelectors = new Map<
        typeof StorableComponent | StorableComponent,
        AttributeSelector
      >();

      traverseAttributeSelector(
        this,
        resolvedAttributeSelector,
        (componentOrObject, subattributeSelector) => {
          if (
            isStorableClassOrInstance(componentOrObject) &&
            !ensureStorableClass(componentOrObject).isEmbedded()
          ) {
            const storable = componentOrObject;

            if (!storablesWithAttributeSelectors.has(storable)) {
              storablesWithAttributeSelectors.set(storable, subattributeSelector);
            } else {
              const mergedAttributeSelector = mergeAttributeSelectors(
                storablesWithAttributeSelectors.get(storable)!,
                subattributeSelector
              );
              storablesWithAttributeSelectors.set(storable, mergedAttributeSelector);
            }
          }
        },
        {includeSubtrees: true, includeLeafs: false}
      );

      if (storablesWithAttributeSelectors.size > 0) {
        await Promise.all(
          Array.from(storablesWithAttributeSelectors).map(
            ([storable, attributeSelector]) =>
              isStorableInstance(storable)
                ? storable.load(attributeSelector, {reload, throwIfMissing, _callerMethodName})
                : undefined // TODO: Implement class loading
          )
        );
      }
    }

    /**
     * Saves the current storable component instance to the store. If the component is new, it will be added to the store with all its attributes. Otherwise, only the attributes that have been modified will be saved to the store.
     *
     * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be saved (default: `true`, which means that all the modified attributes will be saved).
     * @param [options.throwIfMissing] A boolean specifying whether an error should be thrown if the current component is not new and there is no existing component with the same identifier in the store (default: `true` if the component is not new).
     * @param [options.throwIfExists] A boolean specifying whether an error should be thrown if the current component is new and there is an existing component with the same identifier in the store (default: `true` if the component is new).
     *
     * @returns The current [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.
     *
     * @example
     * ```
     * // Retrieve a movie with a few attributes
     * const movie = await Movie.get('abc123', {title: true, rating: true});
     *
     * // Change the movie's rating
     * movie.rating = 8;
     *
     * // Save the new movie's rating to the store
     * await movie.save();
     *
     * // Since the movie's rating has not been changed since the previous save(),
     * // it will not be saved again
     * await movie.save();
     * ```
     *
     * @category Storage Operations
     */
    async save<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector | undefined,
      options: {throwIfMissing: false; throwIfExists?: boolean}
    ): Promise<T | undefined>;
    async save<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector | undefined,
      options: {throwIfMissing?: boolean; throwIfExists: false}
    ): Promise<T | undefined>;
    async save<T extends StorableComponent>(
      this: T,
      attributeSelector?: AttributeSelector,
      options?: {throwIfMissing?: boolean; throwIfExists?: boolean}
    ): Promise<T>;
    @method() async save<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector = true,
      options: {throwIfMissing?: boolean; throwIfExists?: boolean} = {}
    ) {
      const isNew = this.isNew();

      const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

      if (throwIfMissing === true && throwIfExists === true) {
        throw new Error(
          "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
        );
      }

      const computedAttributes = this.getStorableComputedAttributes();
      const computedAttributeSelector = createAttributeSelectorFromAttributes(computedAttributes);

      let resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
        setAttributesOnly: true,
        target: 'store',
        aggregationMode: 'intersection'
      });

      resolvedAttributeSelector = removeFromAttributeSelector(
        resolvedAttributeSelector,
        computedAttributeSelector
      );

      if (!isNew && Object.keys(resolvedAttributeSelector).length < 2) {
        return this; // OPTIMIZATION: There is nothing to save
      }

      await this.beforeSave(resolvedAttributeSelector);

      resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
        setAttributesOnly: true,
        target: 'store',
        aggregationMode: 'intersection'
      });

      resolvedAttributeSelector = removeFromAttributeSelector(
        resolvedAttributeSelector,
        computedAttributeSelector
      );

      if (!isNew && Object.keys(resolvedAttributeSelector).length < 2) {
        return this; // OPTIMIZATION: There is nothing to save
      }

      let savedStorable: T | undefined;

      const constructor = this.constructor as typeof StorableComponent;

      if (constructor.hasStore()) {
        savedStorable = (await constructor.getStore().save(this, {
          attributeSelector: resolvedAttributeSelector,
          throwIfMissing,
          throwIfExists
        })) as T;
      } else if (this.hasRemoteMethod('save')) {
        savedStorable = await this.callRemoteMethod('save', attributeSelector, {
          throwIfMissing,
          throwIfExists
        });
      } else {
        throw new Error(
          `To be able to execute the save() method, a storable component should be registered in a store or have an exposed save() remote method (${this.describeComponent()})`
        );
      }

      if (savedStorable === undefined) {
        return undefined;
      }

      await savedStorable.afterSave(resolvedAttributeSelector);

      return savedStorable;
    }

    _assertArrayItemsAreFullyLoaded(attributeSelector: AttributeSelector) {
      traverseAttributeSelector(
        this,
        attributeSelector,
        (value, attributeSelector, {isArray}) => {
          if (isArray && isComponentInstance(value)) {
            const component = value;

            if (component.constructor.isEmbedded()) {
              if (
                !attributeSelectorsAreEqual(
                  component.resolveAttributeSelector(true),
                  attributeSelector
                )
              ) {
                throw new Error(
                  `Cannot save an array item that has some unset attributes (${component.describeComponent()})`
                );
              }
            }
          }
        },
        {includeSubtrees: true, includeLeafs: false}
      );
    }

    /**
     * Deletes the current storable component instance from the store.
     *
     * @param [options.throwIfMissing] A boolean specifying whether an error should be thrown if there is no matching component in the store (default: `true`).
     *
     * @returns The current [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.
     *
     * @example
     * ```
     * // Retrieve a movie
     * const movie = await Movie.get('abc123');
     *
     * // Delete the movie
     * await movie.delete();
     * ```
     *
     * @category Storage Operations
     */
    async delete<T extends StorableComponent>(
      this: T,
      options: {throwIfMissing: false}
    ): Promise<T | undefined>;
    async delete<T extends StorableComponent>(
      this: T,
      options?: {throwIfMissing?: boolean}
    ): Promise<T>;
    @method() async delete<T extends StorableComponent>(
      this: T,
      options: {throwIfMissing?: boolean} = {}
    ) {
      if (this.isNew()) {
        throw new Error(
          `Cannot delete a storable component that is new (${this.describeComponent()})`
        );
      }

      const {throwIfMissing = true} = options;

      const attributeSelector = this.resolveAttributeSelector(true);
      const computedAttributes = this.getStorableComputedAttributes({attributeSelector});
      const nonComputedAttributeSelector = removeFromAttributeSelector(
        attributeSelector,
        createAttributeSelectorFromAttributes(computedAttributes)
      );

      await this.beforeDelete(nonComputedAttributeSelector);

      let deletedStorable: T | undefined;

      const constructor = this.constructor as typeof StorableComponent;

      if (constructor.hasStore()) {
        deletedStorable = (await constructor.getStore().delete(this, {throwIfMissing})) as T;
      } else if (this.hasRemoteMethod('delete')) {
        deletedStorable = await this.callRemoteMethod('delete', {throwIfMissing});
      } else {
        throw new Error(
          `To be able to execute the delete() method, a storable component should be registered in a store or have an exposed delete() remote method (${this.describeComponent()})`
        );
      }

      if (deletedStorable === undefined) {
        return undefined;
      }

      await deletedStorable.afterDelete(nonComputedAttributeSelector);

      deletedStorable.setIsDeletedMark(true);

      // TODO: deletedStorable.detach();

      return deletedStorable;
    }

    /**
     * Finds some storable component instances matching the specified query in the store, and load all or some of their attributes (and possibly, load some of their referenced components as well).
     *
     * > This method uses the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method under the hood to load the components' attributes. So if you want to expose the [`find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) method to the frontend, you will typically have to expose the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method as well.
     *
     * @param [query] A [`Query`](https://layrjs.com/docs/v2/reference/query) object specifying the criteria to be used when selecting the components from the store (default: `{}`, which means that any component can be selected).
     * @param [attributeSelector] An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
     * @param [options.sort] A plain object specifying how the found components should be sorted (default: `undefined`). The shape of the object should be `{[name]: direction}` where `name` is the name of an attribute, and `direction` is the string `'asc'` or `'desc'` representing the sort direction (ascending or descending).
     * @param [options.skip] A number specifying how many components should be skipped from the found components (default: `0`).
     * @param [options.limit] A number specifying the maximum number of components that should be returned (default: `undefined`).
     * @param [options.reload] A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
     *
     * @returns An array of [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instances.
     *
     * @example
     * ```
     * // Find all the movies
     * await Movie.find();
     *
     * // Find the Japanese movies
     * await Movie.find({country: 'Japan'});
     *
     * // Find the Japanese drama movies
     * await Movie.find({country: 'Japan', genre: 'drama'});
     *
     * // Find the Tarantino's movies
     * const tarantino = await Director.get({slug: 'quentin-tarantino'});
     * await Movie.find({director: tarantino});
     *
     * // Find the movies released after 2010
     * await Movie.find({year: {$greaterThan: 2010}});
     *
     * // Find the top 30 movies
     * await Movie.find({}, true, {sort: {rating: 'desc'}, limit: 30});
     *
     * // Find the next top 30 movies
     * await Movie.find({}, true, {sort: {rating: 'desc'}, skip: 30, limit: 30});
     * ```
     *
     * @category Storage Operations
     */
    @method() static async find<T extends typeof StorableComponent>(
      this: T,
      query: Query = {},
      attributeSelector: AttributeSelector = true,
      options: {sort?: SortDescriptor; skip?: number; limit?: number; reload?: boolean} = {}
    ) {
      const {sort, skip, limit, reload = false} = options;

      query = await this.__callStorablePropertyFindersForQuery(query);
      query = this.__normalizeQuery(query, {loose: !this.hasStore()});

      let foundStorables: InstanceType<T>[];

      if (this.hasStore()) {
        foundStorables = (await this.getStore().find(this, query, {
          sort,
          skip,
          limit
        })) as InstanceType<T>[];
      } else if (this.hasRemoteMethod('find')) {
        foundStorables = await this.callRemoteMethod('find', query, {}, {sort, skip, limit});
      } else {
        throw new Error(
          `To be able to execute the find() method, a storable component should be registered in a store or have an exposed find() remote method (${this.describeComponent()})`
        );
      }

      const loadedStorables = await Promise.all(
        foundStorables.map((foundStorable) =>
          foundStorable.load(attributeSelector, {reload, _callerMethodName: 'find'})
        )
      );

      return loadedStorables;
    }

    /**
     * Counts the number of storable component instances matching the specified query in the store.
     *
     * @param [query] A [`Query`](https://layrjs.com/docs/v2/reference/query) object specifying the criteria to be used when selecting the components from the store (default: `{}`, which means that any component can be selected, and therefore the total number of components available in the store will be returned).
     *
     * @returns A number.
     *
     * @example
     * ```
     * // Count the total number of movies
     * await Movie.count();
     *
     * // Count the number of Japanese movies
     * await Movie.count({country: 'Japan'});
     *
     * // Count the number of Japanese drama movies
     * await Movie.count({country: 'Japan', genre: 'drama'});
     *
     * // Count the number of Tarantino's movies
     * const tarantino = await Director.get({slug: 'quentin-tarantino'})
     * await Movie.count({director: tarantino});
     *
     * // Count the number of movies released after 2010
     * await Movie.count({year: {$greaterThan: 2010}});
     * ```
     *
     * @category Storage Operations
     */
    @method() static async count(query: Query = {}) {
      query = await this.__callStorablePropertyFindersForQuery(query);
      query = this.__normalizeQuery(query, {loose: !this.hasStore()});

      let storablesCount: number;

      if (this.hasStore()) {
        storablesCount = await this.getStore().count(this, query);
      } else if (this.hasRemoteMethod('count')) {
        storablesCount = await this.callRemoteMethod('count', query);
      } else {
        throw new Error(
          `To be able to execute the count() method, a storable component should be registered in a store or have an exposed count() remote method (${this.describeComponent()})`
        );
      }

      return storablesCount;
    }

    static async __callStorablePropertyFindersForQuery(query: Query) {
      for (const property of this.prototype.getStorablePropertiesWithFinder()) {
        const name = property.getName();

        if (!hasOwnProperty(query, name)) {
          continue; // The property finder is not used in the query
        }

        const {[name]: value, ...remainingQuery} = query;

        const finderQuery = await property.callFinder(value);

        query = {...remainingQuery, ...finderQuery};
      }

      return query;
    }

    static __normalizeQuery(query: Query, {loose = false}: {loose?: boolean} = {}) {
      const normalizeQueryForComponent = function (
        query: Query | typeof Component | Component,
        component: typeof Component | Component
      ) {
        if (isComponentClassOrInstance(query)) {
          if (component === query || isPrototypeOf(component, query)) {
            return query.toObject({minimize: true});
          }

          throw new Error(
            `An unexpected component was specified in a query (${component.describeComponent({
              componentPrefix: 'expected'
            })}, ${query.describeComponent({componentPrefix: 'specified'})})`
          );
        }

        if (!isPlainObject(query)) {
          throw new Error(
            `Expected a plain object in a query, but received a value of type '${getTypeOf(query)}'`
          );
        }

        const normalizedQuery: Query = {};

        for (const [name, subquery] of Object.entries<Query>(query)) {
          if (name === '$some' || name === '$every') {
            normalizedQuery[name] = normalizeQueryForComponent(subquery, component);
            continue;
          }

          if (name === '$length') {
            normalizedQuery[name] = subquery;
            continue;
          }

          if (name === '$not') {
            normalizedQuery[name] = normalizeQueryForComponent(subquery, component);
            continue;
          }

          if (name === '$and' || name === '$or' || name === '$nor') {
            if (!Array.isArray(subquery)) {
              throw new Error(
                `Expected an array as value of the operator '${name}', but received a value of type '${getTypeOf(
                  subquery
                )}'`
              );
            }

            const subqueries: Query[] = subquery;
            normalizedQuery[name] = subqueries.map((subquery) =>
              normalizeQueryForComponent(subquery, component)
            );
            continue;
          }

          if (name === '$in') {
            if (!Array.isArray(subquery)) {
              throw new Error(
                `Expected an array as value of the operator '${name}', but received a value of type '${getTypeOf(
                  subquery
                )}'`
              );
            }

            if (!isComponentInstance(component)) {
              throw new Error(
                `The operator '${name}' cannot be used in the context of a component class`
              );
            }

            const nestedComponents: Component[] = subquery;

            const primaryIdentifiers: IdentifierValue[] = nestedComponents.map(
              (nestedComponent) => {
                if (!isComponentInstance(nestedComponent)) {
                  throw new Error(
                    `Expected an array of component instances as value of the operator '${name}', but received a value of type '${getTypeOf(
                      nestedComponent
                    )}'`
                  );
                }

                if (!isPrototypeOf(component, nestedComponent)) {
                  throw new Error(
                    `An unexpected item was specified for the operator '${name}' (${component.describeComponent(
                      {
                        componentPrefix: 'expected'
                      }
                    )}, ${nestedComponent.describeComponent({componentPrefix: 'specified'})})`
                  );
                }

                return nestedComponent.getPrimaryIdentifierAttribute().getValue()!;
              }
            );

            const primaryIdentifierAttributeName = component
              .getPrimaryIdentifierAttribute()
              .getName();

            normalizedQuery[primaryIdentifierAttributeName] = {[name]: primaryIdentifiers};
            continue;
          }

          if (component.hasAttribute(name)) {
            const attribute = component.getAttribute(name);

            normalizedQuery[name] = normalizeQueryForAttribute(subquery, attribute);
          } else {
            if (!loose) {
              throw new Error(
                `An unknown attribute was specified in a query (${component.describeComponent()}, attribute: '${name}')`
              );
            }

            normalizedQuery[name] = subquery;
          }
        }

        return normalizedQuery;
      };

      const normalizeQueryForAttribute = function (query: Query, attribute: Attribute) {
        const type = attribute.getValueType();

        return normalizeQueryForAttributeAndType(query, attribute, type);
      };

      const normalizeQueryForAttributeAndType = function (
        query: Query,
        attribute: Attribute,
        type: ValueType
      ): Query {
        if (isComponentValueTypeInstance(type)) {
          const component = type.getComponent(attribute);

          const normalizedQuery = normalizeQueryForComponent(query, component);

          return normalizedQuery;
        }

        if (isArrayValueTypeInstance(type)) {
          const itemType = type.getItemType();

          let normalizedQuery = normalizeQueryForAttributeAndType(query, attribute, itemType);

          if (isPlainObject(normalizedQuery) && '$includes' in normalizedQuery) {
            // Make '$includes' an alias of '$some'
            normalizedQuery = mapKeys(normalizedQuery, (_value, key) =>
              key === '$includes' ? '$some' : key
            );
          }

          if (
            !(
              isPlainObject(normalizedQuery) &&
              ('$some' in normalizedQuery ||
                '$every' in normalizedQuery ||
                '$length' in normalizedQuery)
            )
          ) {
            // Make '$some' implicit
            normalizedQuery = {$some: normalizedQuery};
          }

          return normalizedQuery;
        }

        return query;
      };

      return normalizeQueryForComponent(query, this.prototype);
    }

    // === isDeleted Mark ===

    __isDeleted: boolean | undefined;

    /**
     * Returns whether the component instance is marked as deleted or not.
     *
     * @returns A boolean.
     *
     * @example
     * ```
     * movie.getIsDeletedMark(); // => false
     * await movie.delete();
     * movie.getIsDeletedMark(); // => true
     * ```
     *
     * @category isDeleted Mark
     */
    getIsDeletedMark() {
      return this.__isDeleted === true;
    }

    /**
     * Sets whether the component instance is marked as deleted or not.
     *
     * @param isDeleted A boolean specifying if the component instance should be marked as deleted or not.
     *
     * @example
     * ```
     * movie.getIsDeletedMark(); // => false
     * movie.setIsDeletedMark(true);
     * movie.getIsDeletedMark(); // => true
     * ```
     *
     * @category isDeleted Mark
     */
    setIsDeletedMark(isDeleted: boolean) {
      Object.defineProperty(this, '__isDeleted', {value: isDeleted, configurable: true});
    }

    // === Hooks ===

    /**
     * A method that you can override to execute some custom logic just before the current storable component instance is loaded from the store.
     *
     * This method is automatically called when the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method), [`get()`](https://layrjs.com/docs/v2/reference/storable#get-class-method), or [`find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) method is called, and there are some attributes to load. If all the attributes have already been loaded by a previous operation, unless the `reload` option is used, this method is not called.
     *
     * @param attributeSelector An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that will be loaded.
     *
     * @example
     * ```
     * // JS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async beforeLoad(attributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.beforeLoad(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @example
     * ```
     * // TS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async beforeLoad(attributeSelector: AttributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.beforeLoad(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @category Hooks
     */
    async beforeLoad(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('beforeLoad', {attributeSelector});
    }

    /**
     * A method that you can override to execute some custom logic just after the current storable component instance has been loaded from the store.
     *
     * This method is automatically called when the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method), [`get()`](https://layrjs.com/docs/v2/reference/storable#get-class-method), or [`find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) method is called, and there were some attributes to load. If all the attributes have already been loaded by a previous operation, unless the `reload` option is used, this method is not called.
     *
     * @param attributeSelector An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that were loaded.
     *
     * @example
     * ```
     * // JS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async afterLoad(attributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.afterLoad(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @example
     * ```
     * // TS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async afterLoad(attributeSelector: AttributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.afterLoad(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @category Hooks
     */
    async afterLoad(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('afterLoad', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    /**
     * A method that you can override to execute some custom logic just before the current storable component instance is saved to the store.
     *
     * This method is automatically called when the [`save()`](https://layrjs.com/docs/v2/reference/storable#save-instance-method) method is called, and there are some modified attributes to save. If no attributes were modified, this method is not called.
     *
     * @param attributeSelector An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that will be saved.
     *
     * @example
     * ```
     * // JS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async beforeSave(attributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.beforeSave(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @example
     * ```
     * // TS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async beforeSave(attributeSelector: AttributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.beforeSave(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @category Hooks
     */
    async beforeSave(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('beforeSave', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    /**
     * A method that you can override to execute some custom logic just after the current storable component instance has been saved to the store.
     *
     * This method is automatically called when the [`save()`](https://layrjs.com/docs/v2/reference/storable#save-instance-method) method is called, and there were some modified attributes to save. If no attributes were modified, this method is not called.
     *
     * @param attributeSelector An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that were saved.
     *
     * @example
     * ```
     * // JS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async afterSave(attributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.afterSave(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @example
     * ```
     * // TS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async afterSave(attributeSelector: AttributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.afterSave(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @category Hooks
     */
    async afterSave(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('afterSave', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    /**
     * A method that you can override to execute some custom logic just before the current storable component instance is deleted from the store.
     *
     * This method is automatically called when the [`delete()`](https://layrjs.com/docs/v2/reference/storable#delete-instance-method) method is called.
     *
     * @param attributeSelector An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that will be deleted.
     *
     * @example
     * ```
     * // JS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async beforeDelete(attributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.beforeDelete(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @example
     * ```
     * // TS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async beforeDelete(attributeSelector: AttributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.beforeDelete(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @category Hooks
     */
    async beforeDelete(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('beforeDelete', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    /**
     * A method that you can override to execute some custom logic just after the current storable component instance has been deleted from the store.
     *
     * This method is automatically called when the [`delete()`](https://layrjs.com/docs/v2/reference/storable#delete-instance-method) method is called.
     *
     * @param attributeSelector An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that were deleted.
     *
     * @example
     * ```
     * // JS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async afterDelete(attributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.afterDelete(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @example
     * ```
     * // TS
     *
     * class Movie extends Storable(Component) {
     *   // ...
     *
     *   async afterDelete(attributeSelector: AttributeSelector) {
     *     // Don't forget to call the parent method
     *     await super.afterDelete(attributeSelector);
     *
     *     // Implement your custom logic here
     *   }
     * }
     * ```
     *
     * @category Hooks
     */
    async afterDelete(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('afterDelete', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    // === Observability ===

    /**
     * See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.
     *
     * @category Observability
     */

    // === Utilities ===

    static get isStorable() {
      return this.prototype.isStorable;
    }

    isStorable(value: any): value is typeof StorableComponent | StorableComponent {
      return isStorable(value);
    }
  }

  Object.defineProperty(Storable, '__mixin', {value: 'Storable'});

  return Storable;
}

// Make sure the name of the Storable mixin persists over minification
Object.defineProperty(Storable, 'displayName', {value: 'Storable'});

export class StorableComponent extends Storable(Component) {}

function describeCaller(callerMethodName: string | undefined) {
  return callerMethodName !== undefined ? ` (called from ${callerMethodName}())` : '';
}
