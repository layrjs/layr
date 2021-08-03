### StorableProperty <badge type="primary">class</badge> {#storable-property-class}

*Inherits from [`Property`](https://layrjs.com/docs/v2/reference/property).*

A base class from which classes such as [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) or [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) are constructed. Unless you build a custom property class, you probably won't have to use this class directly.

#### Creation

##### `new StorableProperty(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a storable property.

**Parameters:**

* `name`: The name of the property.
* `parent`: The [storable component](https://layrjs.com/docs/v2/reference/storable#storable-component-class) class, prototype, or instance that owns the property.
* `options`:
  * `finder`: A function specifying a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) for the property.
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the property should be exposed to remote access.

**Returns:**

The [`StorableProperty`](https://layrjs.com/docs/v2/reference/storable-property) instance that was created.

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Finder

##### `getFinder()` <badge type="secondary-outline">instance method</badge> {#get-finder-instance-method}

Returns the [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type)of  the property.

**Returns:**

A [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) function (or `undefined` if the property has no associated finder).

##### `hasFinder()` <badge type="secondary-outline">instance method</badge> {#has-finder-instance-method}

Returns whether the property has a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type).

**Returns:**

A boolean.

##### `setFinder(finder)` <badge type="secondary-outline">instance method</badge> {#set-finder-instance-method}

Sets a [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) for the property.

**Parameters:**

* `finder`: The [`Finder`](https://layrjs.com/docs/v2/reference/storable-property#finder-type) function to set.

##### `Finder` <badge type="primary-outline">type</badge> {#finder-type}

A function representing the "finder" of a property.

The function should return a [`Query`](https://layrjs.com/docs/v2/reference/query) for the property that is queried for.

The function has the following characteristics:

- It can be `async`.
- As first parameter, it receives the value that was specified in the user's query.
- It is executed with the parent of the property as `this` context.

See an example of use in the [`StorableAttribute`](https://layrjs.com/docs/v2/reference/storable-attribute) and [`StorableMethod`](https://layrjs.com/docs/v2/reference/storable-method) classes.
