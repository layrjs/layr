### PrimaryIdentifierAttribute <badge type="primary">class</badge> {#primary-identifier-attribute-class}

*Inherits from [`IdentifierAttribute`](https://layrjs.com/docs/v2/reference/identifier-attribute).*

A `PrimaryIdentifierAttribute` is a special kind of attribute that uniquely identify a [Component](https://layrjs.com/docs/v2/reference/component) instance.

A `Component` can have only one `PrimaryIdentifierAttribute`. To define a `Component` with more than one identifier, you can add some [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) in addition to the `PrimaryIdentifierAttribute`.

Another characteristic of a `PrimaryIdentifierAttribute` is that its value is immutable (i.e., once set it cannot change). This ensures a stable identity of the components across the different layers of an app (e.g., frontend, backend, and database).

When a `Component` has a `PrimaryIdentifierAttribute`, its instances are managed by an [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map) ensuring that there can only be one instance with a specific identifier.

#### Usage

Typically, you create a `PrimaryIdentifierAttribute` and associate it to a component prototype using the [`@primaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#primary-identifier-decorator) decorator.

For example, here is how you would define a `Movie` class with an `id` primary identifier attribute:

```
// JS

import {Component, primaryIdentifier, attribute} from '@layr/component';

class Movie extends Component {
  // An auto-generated 'string' primary identifier attribute
  @primaryIdentifier() id;

  // A regular attribute
  @attribute('string') title;
}
```

```
// TS

import {Component, primaryIdentifier, attribute} from '@layr/component';

class Movie extends Component {
  // An auto-generated 'string' primary identifier attribute
  @primaryIdentifier() id!: string;

  // A regular attribute
  @attribute('string') title!: string;
}
```

Then, to create a `Movie` instance, you would do something like:

```
const movie = new Movie({title: 'Inception'});

movie.id; // => 'ck41vli1z00013h5xx1esffyn'
movie.title; // => 'Inception'
```

Note that we didn't have to specify a value for the `id` attribute; it was automatically generated (using the [`Component.generateId()`](https://layrjs.com/docs/v2/reference/component#generate-id-class-method) method under the hood).

To create a `Movie` instance with an `id` of your choice, just do:

```
const movie = new Movie({id: 'abc123', title: 'Inception'});

movie.id; // => 'abc123'
movie.title; // => 'Inception'
```

As mentioned previously, when a component has a primary identifier attribute, all its instances are managed by an [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map) ensuring that there is only one instance with a specific identifier.

So, since we previously created a `Movie` with `'abc123'` as primary identifier, we cannot create another `Movie` with the same primary identifier:

```
new Movie({id: 'abc123', title: 'Inception 2'}); // => Error
```

`PrimaryIdentifierAttribute` values are usually of type `'string'` (the default), but you can also have values of type `'number'`:

```
// JS

import {Component, primaryIdentifier} from '@layr/component';

class Movie extends Component {
  // An auto-generated 'number' primary identifier attribute
  @primaryIdentifier('number') id = Math.random();
}
```

```
// TS

import {Component, primaryIdentifier} from '@layr/component';

class Movie extends Component {
  // An auto-generated 'number' primary identifier attribute
  @primaryIdentifier('number') id = Math.random();
}
```

#### Creation

##### `new PrimaryIdentifierAttribute(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute). Typically, instead of using this constructor, you would rather use the [`@primaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#primary-identifier-decorator) decorator.

**Parameters:**

* `name`: The name of the attribute.
* `parent`: The component prototype that owns the attribute.
* `options`:
  * `valueType`: A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
  * `default`: A function returning the default value of the attribute (default when `valueType` is `'string'`: `function () { return this.constructor.generateId() }`).
  * `validators`: An array of [validators](https://layrjs.com/docs/v2/reference/validator) for the value of the attribute.
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.

**Returns:**

The [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) instance that was created.

**Example:**

```
import {Component, PrimaryIdentifierAttribute} from '@layr/component';

class Movie extends Component {}

const id = new PrimaryIdentifierAttribute('id', Movie.prototype);

id.getName(); // => 'id'
id.getParent(); // => Movie.prototype
id.getValueType().toString(); // => 'string'
id.getDefaultValue(); // => function () { return this.constructor.generateId() }`
```

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Attribute Methods

See the methods that are inherited from the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#value-type) class.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.

#### Utilities

##### `isPrimaryIdentifierAttributeClass(value)` <badge type="tertiary-outline">function</badge> {#is-primary-identifier-attribute-class-function}

Returns whether the specified value is a `PrimaryIdentifierAttribute` class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isPrimaryIdentifierAttributeInstance(value)` <badge type="tertiary-outline">function</badge> {#is-primary-identifier-attribute-instance-function}

Returns whether the specified value is a `PrimaryIdentifierAttribute` instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
