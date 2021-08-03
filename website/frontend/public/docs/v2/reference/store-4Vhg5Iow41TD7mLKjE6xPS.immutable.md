### Store <badge type="primary">class</badge> {#store-class}

An abstract class from which classes such as [`MongoDBStore`](https://layrjs.com/docs/v2/reference/mongodb-store) or [`MemoryStore`](https://layrjs.com/docs/v2/reference/memory-store) are constructed. Unless you build a custom store, you probably won't have to use this class directly.

#### Component Registration

##### `registerRootComponent(rootComponent)` <badge type="secondary-outline">instance method</badge> {#register-root-component-instance-method}

Registers all the [storable components](https://layrjs.com/docs/v2/reference/storable#storable-component-class) that are provided (directly or recursively) by the specified root component.

**Parameters:**

* `rootComponent`: A [`Component`](https://layrjs.com/docs/v2/reference/component) class.

**Example:**

```
import {Component} from '@layr/component';
import {Storable} from '@layr/storable';
import {MongoDBStore} from '@layr/mongodb-store';

class User extends Storable(Component) {
  // ...
}

class Movie extends Storable(Component) {
  // ...
}

class Backend extends Component {
  @provide() static User = User;
  @provide() static Movie = Movie;
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerRootComponent(Backend); // User and Movie will be registered
```

##### `getRootComponents()` <badge type="secondary-outline">instance method</badge> {#get-root-components-instance-method}

Gets all the root components that are registered into the store.

**Returns:**

An iterator of [`Component`](https://layrjs.com/docs/v2/reference/component) classes.

##### `getStorable(name)` <badge type="secondary-outline">instance method</badge> {#get-storable-instance-method}

Gets a [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) that is registered into the store. An error is thrown if there is no storable component with the specified name.

**Parameters:**

* `name`: The name of the storable component to get.

**Returns:**

A [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) class.

**Example:**

```
// See the definition of `store` in the `registerRootComponent()` example

store.getStorable('Movie'); // => Movie class
store.getStorable('User'); // => User class
store.getStorable('Film'); // => Error
```

##### `hasStorable(name)` <badge type="secondary-outline">instance method</badge> {#has-storable-instance-method}

Returns whether a [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) is registered into the store.

**Parameters:**

* `name`: The name of the storable component to check.

**Returns:**

A boolean.

**Example:**

```
// See the definition of `store` in the `registerRootComponent()` example

store.hasStorable('Movie'); // => true
store.hasStorable('User'); // => true
store.hasStorable('Film'); // => false
```

##### `registerStorable(storable)` <badge type="secondary-outline">instance method</badge> {#register-storable-instance-method}

Registers a specific [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) into the store. Typically, instead of using this method, you would rather use the [`registerRootComponent()`](https://layrjs.com/docs/v2/reference/store#register-root-component-instance-method) method to register multiple storable components at once.

**Parameters:**

* `storable`: The [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) class to register.

**Example:**

```
class Movie extends Storable(Component) {
  // ...
}

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerStorable(Movie);
```

##### `getStorables()` <badge type="secondary-outline">instance method</badge> {#get-storables-instance-method}

Gets all the [storable components](https://layrjs.com/docs/v2/reference/storable#storable-component-class) that are registered into the store.

**Returns:**

An iterator of [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) classes.

#### Migration

##### `migrateStorables([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#migrate-storables-instance-method}

Migrates the database to reflect all the [storable components](https://layrjs.com/docs/v2/reference/storable#storable-component-class) that are registered into the store.

The migration consists in synchronizing the indexes of the database with the indexes that are defined in each storable component (typically using the [`@index()`](https://layrjs.com/docs/v2/reference/storable#index-decorator) decorator).

**Parameters:**

* `options`:
  * `silent`: A boolean specifying whether the operation should not produce any output in the console (default: `false`).

**Example:**

See an example of use in the [`Index`](https://layrjs.com/docs/v2/reference/index) class.