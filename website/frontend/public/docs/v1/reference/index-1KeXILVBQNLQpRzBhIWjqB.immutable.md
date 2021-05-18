### Index <badge type="primary">class</badge> {#index-class}

Represents an index for one or several [attributes](https://layrjs.com/docs/v1/reference/attribute) of a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class).

Once an index is defined for an attribute, all queries involving this attribute (through the [`find()`](https://layrjs.com/docs/v1/reference/storable#find-class-method) or the [`count()`](https://layrjs.com/docs/v1/reference/storable#count-class-method) methods) can be greatly optimized by the storable component's [store](https://layrjs.com/docs/v1/reference/store) and its underlying database.

#### Usage

##### Single Attribute Indexes

Typically, you create an `Index` for a storable component's attribute by using the [`@index()`](https://layrjs.com/docs/v1/reference/storable#index-decorator) decorator. Then, you call the [`migrateStorables()`](https://layrjs.com/docs/v1/reference/store#migrate-storables-instance-method) method on the storable component's store to effectively create the index in the underlying database.

For example, here is how you would define a `Movie` class with some indexes:

```js
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

export class Movie extends Storable(Component) {
  // Primary and secondary identifier attributes are automatically indexed,
  // so there is no need to define an index for these types of attributes
  @primaryIdentifier() id;

  // Let's define an index for the `title` attribute
  @index() @attribute('string') title;
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

```ts
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

export class Movie extends Storable(Component) {
  // Primary and secondary identifier attributes are automatically indexed,
  // so there is no need to define an index for these types of attributes
  @primaryIdentifier() id!: string;

  // Let's define an index for the `title` attribute
  @index() @attribute('string') title!: string;
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

Then you can call the [`migrateStorables()`](https://layrjs.com/docs/v1/reference/store#migrate-storables-instance-method) method on the store to create the indexes in the MongoDB database:

```
await store.migrateStorables();
```

And now that the `title` attribute is indexed, you can make any query on this attribute in a very performant way:

```
const movies = await Movie.find({title: 'Inception'});
```

##### Compound Attribute Indexes

You can create a compound attribute index to optimize some queries that involve a combination of attributes. To do so, you use the [`@index()`](https://layrjs.com/docs/v1/reference/storable#index-decorator) decorator on the storable component itself:

```js
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

// Let's define a compound attribute index for the combination of the `year`
// attribute (descending order) and the `title` attribute (ascending order)
@index({year: 'desc', title: 'asc'})
export class Movie extends Storable(Component) {
  @primaryIdentifier() id;

  @attribute('string') title;

  @attribute('number') year;
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

```ts
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

// Let's define a compound attribute index for the combination of the `year`
// attribute (descending order) and the `title` attribute (ascending order)
@index({year: 'desc', title: 'asc'})
export class Movie extends Storable(Component) {
  @primaryIdentifier() id!: string;

  @attribute('string') title!: string;

  @attribute('number') year!: number;
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

Then you can call the [`migrateStorables()`](https://layrjs.com/docs/v1/reference/store#migrate-storables-instance-method) method on the store to create the compound attribute index in the MongoDB database:

```
await store.migrateStorables();
```

And now you can make any query involving a combination of `year` and `title` in a very performant way:

```
const movies = await Movie.find(
  {year: {$greaterThan: 2010}},
  true,
  {sort: {year: 'desc', title: 'asc'}}
);
```

#### Creation

##### `new Index(attributes, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Index`](https://layrjs.com/docs/v1/reference/index).

**Parameters:**

* `attributes`: An object specifying the attributes to be indexed. The shape of the object should be `{attributeName: direction, ...}` where `attributeName` is a string representing the name of an attribute and `direction` is a string representing the sort direction (possible values: `'asc'` or `'desc'`).
* `parent`: The storable component prototype that owns the index.
* `options`:
  * `isUnique`: A boolean specifying whether the index should hold unique values or not (default: `false`). When set to `true`, the underlying database will prevent you to store an attribute with the same value in multiple storable components.

**Returns:**

The [`Index`](https://layrjs.com/docs/v1/reference/index) instance that was created.

#### Basic Methods

##### `getAttributes()` <badge type="secondary-outline">instance method</badge> {#get-attributes-instance-method}

Returns the indexed attributes.

**Returns:**

An object of the shape `{attributeName: direction, ...}`.

##### `getParent()` <badge type="secondary-outline">instance method</badge> {#get-parent-instance-method}

Returns the parent of the index.

**Returns:**

A storable component prototype.

#### Utilities

##### `isIndexClass(value)` <badge type="tertiary-outline">function</badge> {#is-index-class-function}

Returns whether the specified value is an `Index` class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isIndexInstance(value)` <badge type="tertiary-outline">function</badge> {#is-index-instance-function}

Returns whether the specified value is an `Index` instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
