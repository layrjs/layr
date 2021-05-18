### MemoryStore <badge type="primary">class</badge> {#memory-store-class}

*Inherits from [`Store`](https://layrjs.com/docs/v1/reference/store).*

A [`Store`](https://layrjs.com/docs/v1/reference/store) that uses the memory to "persist" its registered [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class). Since the stored data is wiped off every time the execution environment is restarted, a `MemoryStore` shouldn't be used for a real application.

#### Usage

Create a `MemoryStore` instance, register some [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class) into it, and then use any [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class)'s method to load, save, delete, or find components from the store.

See an example of use in the [`MongoDBStore`](https://layrjs.com/docs/v1/reference/mongodb-store) class.

#### Creation

##### `new MemoryStore([options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store).

**Parameters:**

* `options`:
  * `initialCollections`: A plain object specifying the initial data that should be populated into the store. The shape of the objet should be `{[collectionName]: documents}` where `collectionName` is the name of a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) class, and `documents` is an array of serialized storable component instances.

**Returns:**

The [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store) instance that was created.

**Example:**

```
// Create an empty memory store
const store = new MemoryStore();

// Create a memory store with some initial data
const store = new MemoryStore({
  User: [
    {
      __component: 'User',
      id: 'xyz789',
      email: 'user@domain.com'
    }
  ],
  Movie: [
    {
      __component: 'Movie',
      id: 'abc123',
      title: 'Inception'
    }
  ]
});
```

#### Component Registration

See the methods that are inherited from the [`Store`](https://layrjs.com/docs/v1/reference/store#component-registration) class.
