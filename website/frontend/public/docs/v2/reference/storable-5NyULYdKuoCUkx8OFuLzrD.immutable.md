### Storable() <badge type="primary">mixin</badge> {#storable-mixin}

Extends a [`Component`](https://layrjs.com/docs/v2/reference/component) class with some storage capabilities.

#### Usage

The `Storable()` mixin can be used both in the backend and the frontend.

##### Backend Usage

Call `Storable()` with a [`Component`](https://layrjs.com/docs/v2/reference/component) class to construct a [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) class that you can extend with your data model and business logic. Then, register this class into a store such as [`MongoDBStore`](https://layrjs.com/docs/v2/reference/mongodb-store) by using the [`registerStorable()`](https://layrjs.com/docs/v2/reference/store#register-storable-instance-method) method (or [`registerRootComponent()`](https://layrjs.com/docs/v2/reference/store#register-root-component-instance-method) to register several components at once).

**Example:**

```js
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

export class Movie extends Storable(Component) {
  @primaryIdentifier() id;

  @attribute() title = '';
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

```ts
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

export class Movie extends Storable(Component) {
  @primaryIdentifier() id!: string;

  @attribute() title = '';
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

Once you have a storable component registered into a store, you can use any method provided by the `Storable()` mixin to interact with the database:

```
const movie = new Movie({id: 'abc123', title: 'Inception'});

// Save the movie to the database
await movie.save();

// Retrieve the movie from the database
await Movie.get('abc123'); // => movie
```

##### Frontend Usage

Typically, you construct a storable component in the frontend by "inheriting" a storable component exposed by the backend. To accomplish that, you create a [`ComponentHTTPClient`](https://layrjs.com/docs/v2/reference/component-http-client), and then call the [`getComponent()`](https://layrjs.com/docs/v2/reference/component-http-client#get-component-instance-method) method to construct your frontend component.

**Example:**

```
import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';

(async () => {
  const client = new ComponentHTTPClient('https://...', {
    mixins: [Storable]
  });

  const Movie = await client.getComponent();
})();
```

> Note that you have to pass the `Storable` mixin when you create a `ComponentHTTPClient` that is consuming a storable component.

Once you have a storable component in the frontend, you can use any method that is exposed by the backend. For example, if the `Movie`'s [`save()`](https://layrjs.com/docs/v2/reference/storable#save-instance-method) method is exposed by the backend, you can call it from the frontend to add a new movie into the database:

```
const movie = new Movie({title: 'Inception 2'});

await movie.save();
```

See the ["Storing Data"](https://layrjs.com/docs/v2/introduction/data-storage) guide for a comprehensive example using the `Storable()` mixin.

### StorableComponent <badge type="primary">class</badge> {#storable-component-class}

*Inherits from [`Component`](https://layrjs.com/docs/v2/reference/component).*

A `StorableComponent` class is constructed by calling the `Storable()` mixin ([see above](https://layrjs.com/docs/v2/reference/storable#storable-mixin)).

#### Component Methods

See the methods that are inherited from the [`Component`](https://layrjs.com/docs/v2/reference/component#creation) class.

#### Store Registration

##### `getStore()` <badge type="secondary">class method</badge> {#get-store-class-method}

Returns the store in which the storable component is registered. If the storable component is not registered in a store, an error is thrown.

**Returns:**

A [`Store`](https://layrjs.com/docs/v2/reference/store) instance.

**Example:**

```
Movie.getStore(); // => store
```

##### `hasStore()` <badge type="secondary">class method</badge> {#has-store-class-method}

Returns whether the storable component is registered in a store.

**Returns:**

A boolean.

**Example:**

```
Movie.hasStore(); // => true
```

#### Storage Operations

##### `get(identifier, [attributeSelector], [options])` <badge type="secondary">class method</badge> <badge type="outline">async</badge> {#get-class-method}

Retrieves a storable component instance (and possibly, some of its referenced components) from the store.

> This method uses the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method under the hood to load the component's attributes. So if you want to expose the [`get()`](https://layrjs.com/docs/v2/reference/storable#get-class-method) method to the frontend, you will typically have to expose the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method as well.

**Parameters:**

* `identifier`: A plain object specifying the identifier of the component you want to retrieve. The shape of the object should be `{[identifierName]: identifierValue}`. Alternatively, you can specify a string or a number representing the value of a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).
* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
* `options`:
  * `reload`: A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
  * `throwIfMissing`: A boolean specifying whether an error should be thrown if there is no component matching the specified `identifier` in the store (default: `true`).

**Returns:**

A [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.

**Example:**

```
// Fully retrieve a movie by its primary identifier
await Movie.get({id: 'abc123'});

// Same as above, but in a short manner
await Movie.get('abc123');

// Fully retrieve a movie by its secondary identifier
await Movie.get({slug: 'inception'});

// Partially retrieve a movie by its primary identifier
await Movie.get({id: 'abc123'}, {title: true, rating: true});

// Partially retrieve a movie, and fully retrieve its referenced director component
await Movie.get({id: 'abc123'}, {title: true, director: true});

// Partially retrieve a movie, and partially retrieve its referenced director component
await Movie.get({id: 'abc123'}, {title: true, director: {fullName: true}});
```

##### `has(identifier, [options])` <badge type="secondary">class method</badge> <badge type="outline">async</badge> {#has-class-method}

Returns whether a storable component instance exists in the store.

**Parameters:**

* `identifier`: A plain object specifying the identifier of the component you want to search. The shape of the object should be `{[identifierName]: identifierValue}`. Alternatively, you can specify a string or a number representing the value of a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).
* `options`:
  * `reload`: A boolean specifying whether a component that has already been loaded should be searched again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.

**Returns:**

A boolean.

**Example:**

```
// Check if there is a movie with a certain primary identifier
await Movie.has({id: 'abc123'}); // => true

// Same as above, but in a short manner
await Movie.has('abc123'); // => true

// Check if there is a movie with a certain secondary identifier
await Movie.has({slug: 'inception'}); // => true
```

##### `load([attributeSelector], [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#load-instance-method}

Loads some attributes of the current storable component instance (and possibly, some of its referenced components) from the store.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
* `options`:
  * `reload`: A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
  * `throwIfMissing`: A boolean specifying whether an error should be thrown if there is no matching component in the store (default: `true`).

**Returns:**

The current [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.

**Example:**

```
// Retrieve a movie with the 'title' attribute only
const movie = await Movie.get('abc123', {title: true});

// Load a few more movie's attributes
await movie.load({tags: true, rating: true});

// Load some attributes of the movie's director
await movie.load({director: {fullName: true}});

// Since the movie's rating has already been loaded,
// it will not be loaded again from the store
await movie.load({rating: true});

// Change the movie's rating
movie.rating = 8.5;

// Since the movie's rating has been modified,
// it will be loaded again from the store
await movie.load({rating: true});

// Force reloading the movie's rating
await movie.load({rating: true}, {reload: true});
```

##### `save([attributeSelector], [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#save-instance-method}

Saves the current storable component instance to the store. If the component is new, it will be added to the store with all its attributes. Otherwise, only the attributes that have been modified will be saved to the store.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be saved (default: `true`, which means that all the modified attributes will be saved).
* `options`:
  * `throwIfMissing`: A boolean specifying whether an error should be thrown if the current component is not new and there is no existing component with the same identifier in the store (default: `true` if the component is not new).
  * `throwIfExists`: A boolean specifying whether an error should be thrown if the current component is new and there is an existing component with the same identifier in the store (default: `true` if the component is new).

**Returns:**

The current [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.

**Example:**

```
// Retrieve a movie with a few attributes
const movie = await Movie.get('abc123', {title: true, rating: true});

// Change the movie's rating
movie.rating = 8;

// Save the new movie's rating to the store
await movie.save();

// Since the movie's rating has not been changed since the previous save(),
// it will not be saved again
await movie.save();
```

##### `delete([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#delete-instance-method}

Deletes the current storable component instance from the store.

**Parameters:**

* `options`:
  * `throwIfMissing`: A boolean specifying whether an error should be thrown if there is no matching component in the store (default: `true`).

**Returns:**

The current [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instance.

**Example:**

```
// Retrieve a movie
const movie = await Movie.get('abc123');

// Delete the movie
await movie.delete();
```

##### `find([query], [attributeSelector], [options])` <badge type="secondary">class method</badge> <badge type="outline">async</badge> {#find-class-method}

Finds some storable component instances matching the specified query in the store, and load all or some of their attributes (and possibly, load some of their referenced components as well).

> This method uses the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method under the hood to load the components' attributes. So if you want to expose the [`find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) method to the frontend, you will typically have to expose the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method) method as well.

**Parameters:**

* `query`: A [`Query`](https://layrjs.com/docs/v2/reference/query) object specifying the criteria to be used when selecting the components from the store (default: `{}`, which means that any component can be selected).
* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
* `options`:
  * `sort`: A plain object specifying how the found components should be sorted (default: `undefined`). The shape of the object should be `{[name]: direction}` where `name` is the name of an attribute, and `direction` is the string `'asc'` or `'desc'` representing the sort direction (ascending or descending).
  * `skip`: A number specifying how many components should be skipped from the found components (default: `0`).
  * `limit`: A number specifying the maximum number of components that should be returned (default: `undefined`).
  * `reload`: A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.

**Returns:**

An array of [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) instances.

**Example:**

```
// Find all the movies
await Movie.find();

// Find the Japanese movies
await Movie.find({country: 'Japan'});

// Find the Japanese drama movies
await Movie.find({country: 'Japan', genre: 'drama'});

// Find the Tarantino's movies
const tarantino = await Director.get({slug: 'quentin-tarantino'});
await Movie.find({director: tarantino});

// Find the movies released after 2010
await Movie.find({year: {$greaterThan: 2010}});

// Find the top 30 movies
await Movie.find({}, true, {sort: {rating: 'desc'}, limit: 30});

// Find the next top 30 movies
await Movie.find({}, true, {sort: {rating: 'desc'}, skip: 30, limit: 30});
```

##### `count([query])` <badge type="secondary">class method</badge> <badge type="outline">async</badge> {#count-class-method}

Counts the number of storable component instances matching the specified query in the store.

**Parameters:**

* `query`: A [`Query`](https://layrjs.com/docs/v2/reference/query) object specifying the criteria to be used when selecting the components from the store (default: `{}`, which means that any component can be selected, and therefore the total number of components available in the store will be returned).

**Returns:**

A number.

**Example:**

```
// Count the total number of movies
await Movie.count();

// Count the number of Japanese movies
await Movie.count({country: 'Japan'});

// Count the number of Japanese drama movies
await Movie.count({country: 'Japan', genre: 'drama'});

// Count the number of Tarantino's movies
const tarantino = await Director.get({slug: 'quentin-tarantino'})
await Movie.count({director: tarantino});

// Count the number of movies released after 2010
await Movie.count({year: {$greaterThan: 2010}});
```

#### isDeleted Mark

##### `getIsDeletedMark()` <badge type="secondary-outline">instance method</badge> {#get-is-deleted-mark-instance-method}

Returns whether the component instance is marked as deleted or not.

**Returns:**

A boolean.

**Example:**

```
movie.getIsDeletedMark(); // => false
await movie.delete();
movie.getIsDeletedMark(); // => true
```

##### `setIsDeletedMark(isDeleted)` <badge type="secondary-outline">instance method</badge> {#set-is-deleted-mark-instance-method}

Sets whether the component instance is marked as deleted or not.

**Parameters:**

* `isDeleted`: A boolean specifying if the component instance should be marked as deleted or not.

**Example:**

```
movie.getIsDeletedMark(); // => false
movie.setIsDeletedMark(true);
movie.getIsDeletedMark(); // => true
```

#### Hooks

##### `beforeLoad(attributeSelector)` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#before-load-instance-method}

A method that you can override to execute some custom logic just before the current storable component instance is loaded from the store.

This method is automatically called when the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method), [`get()`](https://layrjs.com/docs/v2/reference/storable#get-class-method), or [`find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) method is called, and there are some attributes to load. If all the attributes have already been loaded by a previous operation, unless the `reload` option is used, this method is not called.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that will be loaded.

**Example:**

```
// JS

class Movie extends Storable(Component) {
  // ...

  async beforeLoad(attributeSelector) {
    // Don't forget to call the parent method
    await super.beforeLoad(attributeSelector);

    // Implement your custom logic here
  }
}
```
```
// TS

class Movie extends Storable(Component) {
  // ...

  async beforeLoad(attributeSelector: AttributeSelector) {
    // Don't forget to call the parent method
    await super.beforeLoad(attributeSelector);

    // Implement your custom logic here
  }
}
```

##### `afterLoad(attributeSelector)` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#after-load-instance-method}

A method that you can override to execute some custom logic just after the current storable component instance has been loaded from the store.

This method is automatically called when the [`load()`](https://layrjs.com/docs/v2/reference/storable#load-instance-method), [`get()`](https://layrjs.com/docs/v2/reference/storable#get-class-method), or [`find()`](https://layrjs.com/docs/v2/reference/storable#find-class-method) method is called, and there were some attributes to load. If all the attributes have already been loaded by a previous operation, unless the `reload` option is used, this method is not called.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that were loaded.

**Example:**

```
// JS

class Movie extends Storable(Component) {
  // ...

  async afterLoad(attributeSelector) {
    // Don't forget to call the parent method
    await super.afterLoad(attributeSelector);

    // Implement your custom logic here
  }
}
```
```
// TS

class Movie extends Storable(Component) {
  // ...

  async afterLoad(attributeSelector: AttributeSelector) {
    // Don't forget to call the parent method
    await super.afterLoad(attributeSelector);

    // Implement your custom logic here
  }
}
```

##### `beforeSave(attributeSelector)` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#before-save-instance-method}

A method that you can override to execute some custom logic just before the current storable component instance is saved to the store.

This method is automatically called when the [`save()`](https://layrjs.com/docs/v2/reference/storable#save-instance-method) method is called, and there are some modified attributes to save. If no attributes were modified, this method is not called.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that will be saved.

**Example:**

```
// JS

class Movie extends Storable(Component) {
  // ...

  async beforeSave(attributeSelector) {
    // Don't forget to call the parent method
    await super.beforeSave(attributeSelector);

    // Implement your custom logic here
  }
}
```
```
// TS

class Movie extends Storable(Component) {
  // ...

  async beforeSave(attributeSelector: AttributeSelector) {
    // Don't forget to call the parent method
    await super.beforeSave(attributeSelector);

    // Implement your custom logic here
  }
}
```

##### `afterSave(attributeSelector)` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#after-save-instance-method}

A method that you can override to execute some custom logic just after the current storable component instance has been saved to the store.

This method is automatically called when the [`save()`](https://layrjs.com/docs/v2/reference/storable#save-instance-method) method is called, and there were some modified attributes to save. If no attributes were modified, this method is not called.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that were saved.

**Example:**

```
// JS

class Movie extends Storable(Component) {
  // ...

  async afterSave(attributeSelector) {
    // Don't forget to call the parent method
    await super.afterSave(attributeSelector);

    // Implement your custom logic here
  }
}
```
```
// TS

class Movie extends Storable(Component) {
  // ...

  async afterSave(attributeSelector: AttributeSelector) {
    // Don't forget to call the parent method
    await super.afterSave(attributeSelector);

    // Implement your custom logic here
  }
}
```

##### `beforeDelete(attributeSelector)` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#before-delete-instance-method}

A method that you can override to execute some custom logic just before the current storable component instance is deleted from the store.

This method is automatically called when the [`delete()`](https://layrjs.com/docs/v2/reference/storable#delete-instance-method) method is called.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that will be deleted.

**Example:**

```
// JS

class Movie extends Storable(Component) {
  // ...

  async beforeDelete(attributeSelector) {
    // Don't forget to call the parent method
    await super.beforeDelete(attributeSelector);

    // Implement your custom logic here
  }
}
```
```
// TS

class Movie extends Storable(Component) {
  // ...

  async beforeDelete(attributeSelector: AttributeSelector) {
    // Don't forget to call the parent method
    await super.beforeDelete(attributeSelector);

    // Implement your custom logic here
  }
}
```

##### `afterDelete(attributeSelector)` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#after-delete-instance-method}

A method that you can override to execute some custom logic just after the current storable component instance has been deleted from the store.

This method is automatically called when the [`delete()`](https://layrjs.com/docs/v2/reference/storable#delete-instance-method) method is called.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) indicating the attributes that were deleted.

**Example:**

```
// JS

class Movie extends Storable(Component) {
  // ...

  async afterDelete(attributeSelector) {
    // Don't forget to call the parent method
    await super.afterDelete(attributeSelector);

    // Implement your custom logic here
  }
}
```
```
// TS

class Movie extends Storable(Component) {
  // ...

  async afterDelete(attributeSelector: AttributeSelector) {
    // Don't forget to call the parent method
    await super.afterDelete(attributeSelector);

    // Implement your custom logic here
  }
}
```

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.

#### Decorators

##### `@attribute([valueType], [options])` <badge type="tertiary">decorator</badge> {#attribute-decorator}

Decorates an attribute of a storable component so it can be combined with a [`Loader`](https://layrjs.com/docs/v2/reference/storable-attribute#loader-type), a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type), or any kind of [`Hook`](https://layrjs.com/docs/v2/reference/storable-attribute#hook-type).

**Parameters:**

* `valueType`: A string specifying the [type of values](https://layrjs.com/docs/v2/reference/value-type#supported-types) that can be stored in the attribute (default: `'any'`).
* `options`: The options to create the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute#constructor).

**Example:**

See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) class.
##### `@primaryIdentifier([valueType], [options])` <badge type="tertiary">decorator</badge> {#primary-identifier-decorator}

Decorates an attribute of a component as a [storable primary identifier attribute](https://layrjs.com/docs/v2/reference/storable-primary-identifier-attribute).

**Parameters:**

* `valueType`: A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
* `options`: The options to create the [`StorablePrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/storable-primary-identifier-attribute#constructor).

##### `@secondaryIdentifier([valueType], [options])` <badge type="tertiary">decorator</badge> {#secondary-identifier-decorator}

Decorates an attribute of a component as a [storable secondary identifier attribute](https://layrjs.com/docs/v2/reference/storable-secondary-identifier-attribute).

**Parameters:**

* `valueType`: A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
* `options`: The options to create the [`StorableSecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/storable-secondary-identifier-attribute#constructor).

##### `@method([options])` <badge type="tertiary">decorator</badge> {#method-decorator}

Decorates a method of a storable component so it can be combined with a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type).

**Parameters:**

* `options`: The options to create the [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method#constructor).

**Example:**

See an example of use in the [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) class.
##### `@loader(loader)` <badge type="tertiary">decorator</badge> {#loader-decorator}

Decorates a storable attribute with a [`Loader`](https://layrjs.com/docs/v2/reference/storable-attribute#loader-type).

**Parameters:**

* `loader`: A function representing the [`Loader`](https://layrjs.com/docs/v2/reference/storable-attribute#loader-type) of the storable attribute.

**Example:**

See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) class.
##### `@finder(finder)` <badge type="tertiary">decorator</badge> {#finder-decorator}

Decorates a storable attribute or method with a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type).

**Parameters:**

* `finder`: A function representing the [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) of the storable attribute or method.

**Example:**

See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) and [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) classes.
##### `@index([optionsOrAttributes], [options])` <badge type="tertiary">decorator</badge> {#index-decorator}

Defines an [index](https://layrjs.com/docs/v2/reference/index) for an attribute or a set of attributes.

This decorator is commonly placed before a storable component attribute to define a [single attribute index](https://layrjs.com/docs/v2/reference/index#single-attribute-indexes), but it can also be placed before a storable component class to define a [compound attribute index](https://layrjs.com/docs/v2/reference/index#compound-attribute-indexes).

**Parameters:**

* `optionsOrAttributes`: Depends on the type of index you want to define (see below).
* `options`: An object specifying some options in the case of compound attribute index (see below).

###### Single Attribute Indexes

You can define an index for a single attribute by placing the `@index()` decorator before an attribute definition. In this case, you can specify the following parameters:

- `options`:
  - `direction`: A string representing the sort direction of the index. The possible values are `'asc'` (ascending) or `'desc'` (descending) and the default value is `'asc'`.
  - `isUnique`: A boolean specifying whether the index should hold unique values or not (default: `false`). When set to `true`, the underlying database will prevent you to store an attribute with the same value in multiple storable components.

###### Compound Attribute Indexes

You can define an index that combines multiple attributes by placing the `@index()` decorator before a storable component class definition. In this case, you can specify the following parameters:

- `attributes`: An object specifying the attributes to be indexed. The shape of the object should be `{attributeName: direction, ...}` where `attributeName` is a string representing the name of an attribute and `direction` is a string representing the sort direction (possible values: `'asc'` or `'desc'`).
- `options`:
  - `isUnique`: A boolean specifying whether the index should hold unique values or not (default: `false`). When set to `true`, the underlying database will prevent you to store an attribute with the same value in multiple storable components.

**Example:**

```
// JS

import {Component} from '@layr/component';
import {Storable, attribute, index} from '@layr/storable';

// An index that combines the `year` and `title` attributes:
@index({year: 'desc', title: 'asc'})
export class Movie extends Storable(Component) {
  // An index for the `title` attribute with the `isUnique` option:
  @index({isUnique: true}) @attribute('string') title;

  // An index for the `year` attribute with the `'desc'` sort direction:
  @index({direction: 'desc'}) @attribute('number') year;
}
```
```
// TS

import {Component} from '@layr/component';
import {Storable, attribute, index} from '@layr/storable';

// An index that combines the `year` and `title` attributes:
@index({year: 'desc', title: 'asc'})
export class Movie extends Storable(Component) {
  // An index for the `title` attribute with the `isUnique` option:
  @index({isUnique: true}) @attribute('string') title!: string;

  // An index for the `year` attribute with the `'desc'` sort direction:
  @index({direction: 'desc'}) @attribute('number') year!: string;
}
```

#### Utilities

##### `isStorableClass(value)` <badge type="tertiary-outline">function</badge> {#is-storable-class-function}

Returns whether the specified value is a storable component class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isStorableInstance(value)` <badge type="tertiary-outline">function</badge> {#is-storable-instance-function}

Returns whether the specified value is a storable component instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isStorableClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#is-storable-class-or-instance-function}

Returns whether the specified value is a storable component class or instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `assertIsStorableClass(value)` <badge type="tertiary-outline">function</badge> {#assert-is-storable-class-function}

Throws an error if the specified value is not a storable component class.

**Parameters:**

* `value`: A value of any type.

##### `assertIsStorableInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-storable-instance-function}

Throws an error if the specified value is not a storable component instance.

**Parameters:**

* `value`: A value of any type.

##### `assertIsStorableClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-storable-class-or-instance-function}

Throws an error if the specified value is not a storable component class or instance.

**Parameters:**

* `value`: A value of any type.

##### `ensureStorableClass(component)` <badge type="tertiary-outline">function</badge> {#ensure-storable-class-function}

Ensures that the specified storable component is a class. If you specify a storable component instance (or prototype), the class of the component is returned. If you specify a storable component class, it is returned as is.

**Parameters:**

* `component`: A storable component class or instance.

**Returns:**

A storable component class.

**Example:**

```
ensureStorableClass(movie) => Movie
ensureStorableClass(Movie.prototype) => Movie
ensureStorableClass(Movie) => Movie
```

##### `ensureStorableInstance(component)` <badge type="tertiary-outline">function</badge> {#ensure-storable-instance-function}

Ensures that the specified storable component is an instance (or prototype). If you specify a storable component class, the component prototype is returned. If you specify a storable component instance (or prototype), it is returned as is.

**Parameters:**

* `component`: A storable component class or instance.

**Returns:**

A storable component instance (or prototype).

**Example:**

```
ensureStorableInstance(Movie) => Movie.prototype
ensureStorableInstance(Movie.prototype) => Movie.prototype
ensureStorableInstance(movie) => movie
```
