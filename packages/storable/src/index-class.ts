import {
  isAttributeInstance,
  isIdentifierAttributeInstance,
  isComponentValueTypeInstance,
  isObjectValueTypeInstance
} from '@layr/component';
import {assertIsPlainObject, assertNoUnknownOptions} from 'core-helpers';

import type {StorableComponent, SortDirection} from './storable';
import {isStorableAttributeInstance} from './properties/storable-attribute';
import {assertIsStorableInstance} from './utilities';

export type IndexAttributes = {[name: string]: SortDirection};

export type IndexOptions = {isUnique?: boolean};

/**
 * Represents an index for one or several [attributes](https://layrjs.com/docs/v1/reference/attribute) of a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class).
 *
 * Once an index is defined for an attribute, all queries involving this attribute (through the [`find()`](https://layrjs.com/docs/v1/reference/storable#find-class-method) or the [`count()`](https://layrjs.com/docs/v1/reference/storable#count-class-method) methods) can be greatly optimized by the storable component's [store](https://layrjs.com/docs/v1/reference/store) and its underlying database.
 *
 * #### Usage
 *
 * ##### Single Attribute Indexes
 *
 * Typically, you create an `Index` for a storable component's attribute by using the [`@index()`](https://layrjs.com/docs/v1/reference/storable#index-decorator) decorator. Then, you call the [`migrateStorables()`](https://layrjs.com/docs/v1/reference/store#migrate-storables-instance-method) method on the storable component's store to effectively create the index in the underlying database.
 *
 * For example, here is how you would define a `Movie` class with some indexes:
 *
 * ```js
 * // JS
 *
 * import {Component} from '@layr/component';
 * import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
 * import {MongoDBStore} from '@layr/mongodb-store';
 *
 * export class Movie extends Storable(Component) {
 *   // Primary and secondary identifier attributes are automatically indexed,
 *   // so there is no need to define an index for these types of attributes
 *   @primaryIdentifier() id;
 *
 *   // Let's define an index for the `title` attribute
 *   @index() @attribute('string') title;
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
 * import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
 * import {MongoDBStore} from '@layr/mongodb-store';
 *
 * export class Movie extends Storable(Component) {
 *   // Primary and secondary identifier attributes are automatically indexed,
 *   // so there is no need to define an index for these types of attributes
 *   @primaryIdentifier() id!: string;
 *
 *   // Let's define an index for the `title` attribute
 *   @index() @attribute('string') title!: string;
 * }
 *
 * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
 *
 * store.registerStorable(Movie);
 * ```
 *
 * Then you can call the [`migrateStorables()`](https://layrjs.com/docs/v1/reference/store#migrate-storables-instance-method) method on the store to create the indexes in the MongoDB database:
 *
 * ```
 * await store.migrateStorables();
 * ```
 *
 * And now that the `title` attribute is indexed, you can make any query on this attribute in a very performant way:
 *
 * ```
 * const movies = await Movie.find({title: 'Inception'});
 * ```
 *
 * ##### Compound Attribute Indexes
 *
 * You can create a compound attribute index to optimize some queries that involve a combination of attributes. To do so, you use the [`@index()`](https://layrjs.com/docs/v1/reference/storable#index-decorator) decorator on the storable component itself:
 *
 * ```js
 * // JS
 *
 * import {Component} from '@layr/component';
 * import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
 * import {MongoDBStore} from '@layr/mongodb-store';
 *
 * // Let's define a compound attribute index for the combination of the `year`
 * // attribute (descending order) and the `title` attribute (ascending order)
 * ﹫index({year: 'desc', title: 'asc'})
 * export class Movie extends Storable(Component) {
 *   @primaryIdentifier() id;
 *
 *   @attribute('string') title;
 *
 *   @attribute('number') year;
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
 * import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
 * import {MongoDBStore} from '@layr/mongodb-store';
 *
 * // Let's define a compound attribute index for the combination of the `year`
 * // attribute (descending order) and the `title` attribute (ascending order)
 * ﹫index({year: 'desc', title: 'asc'})
 * export class Movie extends Storable(Component) {
 *   @primaryIdentifier() id!: string;
 *
 *   @attribute('string') title!: string;
 *
 *   @attribute('number') year!: number;
 * }
 *
 * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
 *
 * store.registerStorable(Movie);
 * ```
 *
 * Then you can call the [`migrateStorables()`](https://layrjs.com/docs/v1/reference/store#migrate-storables-instance-method) method on the store to create the compound attribute index in the MongoDB database:
 *
 * ```
 * await store.migrateStorables();
 * ```
 *
 * And now you can make any query involving a combination of `year` and `title` in a very performant way:
 *
 * ```
 * const movies = await Movie.find(
 *   {year: {$greaterThan: 2010}},
 *   true,
 *   {sort: {year: 'desc', title: 'asc'}}
 * );
 * ```
 */
export class Index {
  _attributes: IndexAttributes;
  _parent: StorableComponent;
  _options!: IndexOptions;

  /**
   * Creates an instance of [`Index`](https://layrjs.com/docs/v1/reference/index).
   *
   * @param attributes An object specifying the attributes to be indexed. The shape of the object should be `{attributeName: direction, ...}` where `attributeName` is a string representing the name of an attribute and `direction` is a string representing the sort direction (possible values: `'asc'` or `'desc'`).
   * @param parent The storable component prototype that owns the index.
   * @param [options.isUnique] A boolean specifying whether the index should hold unique values or not (default: `false`). When set to `true`, the underlying database will prevent you to store an attribute with the same value in multiple storable components.
   *
   * @returns The [`Index`](https://layrjs.com/docs/v1/reference/index) instance that was created.
   *
   * @category Creation
   */
  constructor(attributes: IndexAttributes, parent: StorableComponent, options: IndexOptions = {}) {
    assertIsPlainObject(attributes);
    assertIsStorableInstance(parent);

    for (const [name, direction] of Object.entries(attributes)) {
      if (!parent.hasProperty(name)) {
        throw new Error(
          `Cannot create an index for an attribute that doesn't exist (${parent.describeComponent()}, attribute: '${name}')`
        );
      }

      const property = parent.getProperty(name, {autoFork: false});

      if (!isAttributeInstance(property)) {
        throw new Error(
          `Cannot create an index for a property that is not an attribute (${parent.describeComponent()}, property: '${name}')`
        );
      }

      if (isStorableAttributeInstance(property) && property.isComputed()) {
        throw new Error(
          `Cannot create an index for a computed attribute (${parent.describeComponent()}, attribute: '${name}')`
        );
      }

      const scalarType = property.getValueType().getScalarType();

      if (isObjectValueTypeInstance(scalarType)) {
        throw new Error(
          `Cannot create an index for an attribute of type 'object' (${parent.describeComponent()}, attribute: '${name}')`
        );
      }

      if (!(direction === 'asc' || direction === 'desc')) {
        throw new Error(
          `Cannot create an index with an invalid sort direction (${parent.describeComponent()}, attribute: '${name}', sort direction: '${direction}')`
        );
      }
    }

    if (Object.keys(attributes).length === 0) {
      throw new Error(
        `Cannot create an index for an empty 'attributes' parameter (${parent.describeComponent()})`
      );
    }

    if (Object.keys(attributes).length === 1) {
      const name = Object.keys(attributes)[0];
      const attribute = parent.getAttribute(name, {autoFork: false});

      if (isIdentifierAttributeInstance(attribute)) {
        throw new Error(
          `Cannot explicitly create an index for an identifier attribute (${parent.describeComponent()}, attribute: '${name}'). Note that this type of attribute is automatically indexed.`
        );
      }

      const scalarType = attribute.getValueType().getScalarType();

      if (isComponentValueTypeInstance(scalarType)) {
        throw new Error(
          `Cannot explicitly create an index for an attribute of type 'Component' (${parent.describeComponent()}, attribute: '${name}'). Note that primary identifier attributes of referenced components are automatically indexed.`
        );
      }
    }

    this._attributes = attributes;
    this._parent = parent;

    this.setOptions(options);
  }

  /**
   * Returns the indexed attributes.
   *
   * @returns An object of the shape `{attributeName: direction, ...}`.
   *
   * @category Basic Methods
   */
  getAttributes() {
    return this._attributes;
  }

  /**
   * Returns the parent of the index.
   *
   * @returns A storable component prototype.
   *
   * @category Basic Methods
   */
  getParent() {
    return this._parent;
  }

  // === Options ===

  getOptions() {
    return this._options;
  }

  setOptions(options: IndexOptions = {}) {
    const {isUnique, ...unknownOptions} = options;

    assertNoUnknownOptions(unknownOptions);

    this._options = {isUnique};
  }

  // === Forking ===

  fork(parent: StorableComponent) {
    const forkedIndex = Object.create(this) as Index;

    forkedIndex._parent = parent;

    return forkedIndex;
  }

  // === Utilities ===

  static isIndex(value: any): value is Index {
    return isIndexInstance(value);
  }

  static _buildIndexKey(attributes: IndexAttributes) {
    return JSON.stringify(attributes);
  }
}

/**
 * Returns whether the specified value is an `Index` class.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isIndexClass(value: any): value is typeof Index {
  return typeof value?.isIndex === 'function';
}

/**
 * Returns whether the specified value is an `Index` instance.
 *
 * @param value A value of any type.
 *
 * @returns A boolean.
 *
 * @category Utilities
 */
export function isIndexInstance(value: any): value is Index {
  return isIndexClass(value?.constructor) === true;
}
