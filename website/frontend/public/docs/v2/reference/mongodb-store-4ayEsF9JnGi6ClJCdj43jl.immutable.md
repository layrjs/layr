### MongoDBStore <badge type="primary">class</badge> {#mongo-db-store-class}

*Inherits from [`Store`](https://layrjs.com/docs/v2/reference/store).*

A [`Store`](https://layrjs.com/docs/v2/reference/store) that uses a [MongoDB](https://www.mongodb.com/) database to persist its registered [storable components](https://layrjs.com/docs/v2/reference/storable#storable-component-class).

#### Usage

Create a `MongoDBStore` instance, register some [storable components](https://layrjs.com/docs/v2/reference/storable#storable-component-class) into it, and then use any [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class)'s method to load, save, delete, or find components from the store.

For example, let's build a simple `Backend` that provides a `Movie` component.

First, let's define the components that we are going to use:

```
// JS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id;

  @attribute() title = '';
}

class Backend extends Component {
  @provide() static Movie = Movie;
}
```

```
// TS

import {Component} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';

class Movie extends Storable(Component) {
  @primaryIdentifier() id!: string;

  @attribute() title = '';
}

class Backend extends Component {
  @provide() static Movie = Movie;
}
```

Next, let's create a `MongoDBStore` instance, and let's register the `Backend` component as the root component of the store:

```
import {MongoDBStore} from '@layr/mongodb-store';

const store = new MongoDBStore('mongodb://user:pass@host:port/db');

store.registerRootComponent(Backend);
```

Finally, we can interact with the store by calling some [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) methods:

```
let movie = new Movie({id: 'abc123', title: 'Inception'});

// Save the movie to the store
await movie.save();

// Get the movie from the store
movie = await Movie.get('abc123');
movie.title; // => 'Inception'

// Modify the movie, and save it to the store
movie.title = 'Inception 2';
await movie.save();

// Find the movies that have a title starting with 'Inception'
const movies = await Movie.find({title: {$startsWith: 'Inception'}});
movies.length; // => 1 (one movie found)
movies[0].title; // => 'Inception 2'
movies[0] === movie; // true (thanks to the identity mapping)

// Delete the movie from the store
await movie.delete();
```

##### `private()` <badge type="secondary-outline">instance method</badge> {#private-instance-method}

Fix an issue when localhost resolves to an IPv6 loopback address (::1).

It happens in the following environment:
- macOS v13.0.1
- Node.js v18.12.1

#### Creation

##### `new MongoDBStore(connectionString, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a [`MongoDBStore`](https://layrjs.com/docs/v2/reference/mongodb-store).

**Parameters:**

* `connectionString`: The [connection string](https://docs.mongodb.com/manual/reference/connection-string/) of the MongoDB database to use.
* `options`:
  * `poolSize`: A number specifying the maximum size of the connection pool (default: `1`).

**Returns:**

The [`MongoDBStore`](https://layrjs.com/docs/v2/reference/mongodb-store) instance that was created.

**Example:**

```
const store = new MongoDBStore('mongodb://user:pass@host:port/db');
```

#### Component Registration

See the methods that are inherited from the [`Store`](https://layrjs.com/docs/v2/reference/store#component-registration) class.

#### Connection to MongoDB

##### `connect()` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#connect-instance-method}

Initiates a connection to the MongoDB database.

Since this method is called automatically when you interact with the store through any of the [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storable-component-class) methods, you shouldn't have to call it manually.

##### `disconnect()` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#disconnect-instance-method}

Closes the connection to the MongoDB database. Unless you are building a tool that uses a store for an ephemeral duration, you shouldn't have to call this method.

#### Migration

See the methods that are inherited from the [`Store`](https://layrjs.com/docs/v2/reference/store#migration) class.
