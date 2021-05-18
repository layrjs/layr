### Property <badge type="primary">class</badge> {#property-class}

A base class from which classes such as [`Attribute`](https://layrjs.com/docs/v1/reference/attribute) or [`Method`](https://layrjs.com/docs/v1/reference/method) are constructed. Unless you build a custom property class, you probably won't have to use this class directly.

#### Creation

##### `new Property(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Property`](https://layrjs.com/docs/v1/reference/property).

**Parameters:**

* `name`: The name of the property.
* `parent`: The component class, prototype, or instance that owns the property.
* `options`:
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v1/reference/property#property-exposure-type) object specifying how the property should be exposed to remote access.

**Returns:**

The [`Property`](https://layrjs.com/docs/v1/reference/property) instance that was created.

**Example:**

```
import {Component, Property} from '@layr/component';

class Movie extends Component {}

const titleProperty = new Property('title', Movie.prototype);

titleProperty.getName(); // => 'title'
titleProperty.getParent(); // => Movie.prototype
```

#### Basic Methods

##### `getName()` <badge type="secondary-outline">instance method</badge> {#get-name-instance-method}

Returns the name of the property.

**Returns:**

A string.

**Example:**

```
titleProperty.getName(); // => 'title'
```

##### `getParent()` <badge type="secondary-outline">instance method</badge> {#get-parent-instance-method}

Returns the parent of the property.

**Returns:**

A component class, prototype, or instance.

**Example:**

```
titleProperty.getParent(); // => Movie.prototype
```

#### Exposure

##### `getExposure()` <badge type="secondary-outline">instance method</badge> {#get-exposure-instance-method}

Returns an object specifying how the property is exposed to remote access.

**Returns:**

A [`PropertyExposure`](https://layrjs.com/docs/v1/reference/property#property-exposure-type) object.

**Example:**

```
titleProperty.getExposure(); // => {get: true, set: true}
```

##### `setExposure([exposure])` <badge type="secondary-outline">instance method</badge> {#set-exposure-instance-method}

Sets how the property is exposed to remote access.

**Parameters:**

* `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v1/reference/property#property-exposure-type) object.

**Example:**

```
titleProperty.setExposure({get: true, set: true});
```

##### `operationIsAllowed(operation)` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#operation-is-allowed-instance-method}

Returns whether an operation is allowed on the property.

**Parameters:**

* `operation`: A string representing an operation. Currently supported operations are 'get', 'set', and 'call'.

**Returns:**

A boolean.

**Example:**

```
titleProperty.operationIsAllowed('get'); // => true
titleProperty.operationIsAllowed('call'); // => false
```

##### `PropertyExposure` <badge type="primary-outline">type</badge> {#property-exposure-type}

A `PropertyExposure` is a plain object specifying how a property is exposed to remote access.

The shape of the object is `{[operation]: permission}` where:

- `operation` is a string representing the different types of operations (`'get'` and `'set'` for attributes, and `'call'` for methods).
- `permission` is a boolean (or a string or array of strings if the [`WithRoles`](https://layrjs.com/docs/v1/reference/with-roles) mixin is used) specifying whether the operation is allowed or not.

**Example:**

```
{get: true, set: true}
{get: 'anyone', set: ['author', 'admin']}
{call: true}
{call: 'admin'}
```
