### Component <badge type="primary">class</badge> {#component-class}

*Inherits from [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class).*

A component is an elementary building block allowing you to define your data models and implement the business logic of your application. Typically, an application is composed of several components that are connected to each other by using the [`@provide()`](https://layrjs.com/docs/v2/reference/component#provide-decorator) and [`@consume()`](https://layrjs.com/docs/v2/reference/component#consume-decorator) decorators.

#### Usage

Just extend the `Component` class to define a component with some attributes and methods that are specific to your application.

For example, a `Movie` component with a `title` attribute and a `play()` method could be defined as follows:

```
// JS

import {Component} from '@layr/component';

class Movie extends Component {
  @attribute('string') title;

  @method() play() {
    console.log(`Playing '${this.title}...'`);
  }
}
```

```
// TS

import {Component} from '@layr/component';

class Movie extends Component {
  @attribute('string') title!: string;

  @method() play() {
    console.log(`Playing '${this.title}...'`);
  }
}
```

The [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) and [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorators allows you to get the full power of Layr, such as attribute validation or remote method invocation.

> Note that you don't need to use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator for all your methods. Typically, you use this decorator only for some backend methods that you want to expose to the frontend.

Once you have defined a component, you can use it as any JavaScript/TypeScript class:

```
const movie = new Movie({title: 'Inception'});

movie.play(); // => 'Playing Inception...'
```

#### Embedded Components

Use the [`EmbeddedComponent`](https://layrjs.com/docs/v2/reference/embedded-component) class to embed a component into another component. An embedded component is strongly attached to the parent component that owns it, and it cannot "live" by itself like a regular component.

Here are some characteristics of an embedded component:

- An embedded component has one parent only, and therefore cannot be embedded in more than one component.
- When the parent of an embedded component is [validated](https://layrjs.com/docs/v2/reference/validator), the embedded component is validated as well.
- When the parent of an embedded component is loaded, saved, or deleted (using a [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storage-operations) method), the embedded component is loaded, saved, or deleted as well.

See the [`EmbeddedComponent`](https://layrjs.com/docs/v2/reference/embedded-component) class for an example of use.

#### Referenced Components

Any non-embedded component can be referenced by another component. Contrary to an embedded component, a referenced component is an independent entity that can "live" by itself. So a referenced component behaves like a regular JavaScript object that can be referenced by another object.

Here are some characteristics of a referenced component:

- A referenced component can be referenced by any number of components.
- When a component holding a reference to another component is [validated](https://layrjs.com/docs/v2/reference/validator), the referenced component is considered as an independent entity, and is therefore not validated automatically.
- When a component holding a reference to another component is loaded, saved, or deleted (using a [`StorableComponent`](https://layrjs.com/docs/v2/reference/storable#storage-operations) method), the referenced component may optionally be loaded in the same operation, but it has to be saved or deleted independently.

For example, let's say we have a `Director` component defined as follows:

```
// JS

class Director extends Component {
  @attribute('string') fullName;
}
```

```
// TS

class Director extends Component {
  @attribute('string') fullName!: string;
}
```

Next, we can add an attribute to the `Movie` component to store a reference to a `Director`:

```
// JS

class Movie extends Component {
  @provide() static Director = Director;

  // ...

  @attribute('Director') director;
}
```

```
// TS

class Movie extends Component {
  @provide() static Director = Director;

  // ...

  @attribute('Director') director!: Director;
}
```

> Note that to be able to specify the `'Director'` type for the `director` attribute, you first have to make the `Movie` component aware of the `Director` component by using the [`@provide()`](https://layrjs.com/docs/v2/reference/component#provide-decorator) decorator.

 Then, to create a `Movie` with a `Director`, we can do something like the following:

```
const movie = new Movie({
  title: 'Inception',
  director: new Director({fullName: 'Christopher Nolan'})
});

movie.title; // => 'Inception'
movie.director.fullName; // => 'Christopher Nolan'
```

#### Creation

##### `new Component([object])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of a component class.

**Parameters:**

* `object`: An optional object specifying the value of the component attributes.

**Returns:**

The component instance that was created.

**Example:**

```
// JS

import {Component, attribute} from '@layr/component';

class Movie extends Component {
  @attribute('string') title;
}

const movie = new Movie({title: 'Inception'});

movie.title // => 'Inception'
```
```
// TS

import {Component, attribute} from '@layr/component';

class Movie extends Component {
  @attribute('string') title!: string;
}

const movie = new Movie({title: 'Inception'});

movie.title // => 'Inception'
```

#### Initialization

##### `initialize()` <badge type="secondary">class method</badge> <badge type="outline">possibly async</badge> {#initialize-class-method}

Invoke this method to call any `initializer()` static method defined in your component classes.

If the current class has an `initializer()` static method, it is invoked, and if the current class has some other components as dependencies, the `initializer()` method is also invoked for those components.

Note that your `initializer()` methods can be asynchronous, and therefore you should call the `initialize()` method with `await`.

Typically, you will call the `initialize()` method on the root component of your frontend application when your application starts. Backend applications are usually managed by a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server), which automatically invokes the `initialize()` method on the root component.

Note that if you use [Boostr](https://boostr.dev) to manage your frontend application, you should not call the `initialize()` method manually.

#### Naming

##### `getComponentName()` <badge type="secondary">class method</badge> {#get-component-name-class-method}

Returns the name of the component, which is usually the name of the corresponding class.

**Returns:**

A string.

**Example:**

```
Movie.getComponentName(); // => 'Movie'
```

##### `setComponentName(name)` <badge type="secondary">class method</badge> {#set-component-name-class-method}

Sets the name of the component. As the name of a component is usually inferred from the name of its class, this method should rarely be used.

**Parameters:**

* `name`: The name you wish for the component.

**Example:**

```
Movie.getComponentName(); // => 'Movie'
Movie.setComponentName('Film');
Movie.getComponentName(); // => 'Film'
```

##### `getComponentPath()` <badge type="secondary">class method</badge> {#get-component-path-class-method}

Returns the path of the component starting from its root component.

For example, if an `Application` component provides a `Movie` component, this method will return `'Application.Movie'` when called on the `Movie` component.

**Returns:**

A string.

**Example:**

```
class Movie extends Component {}

Movie.getComponentPath(); // => 'Movie'

class Application extends Component {
  @provide() static Movie = Movie;
}

Movie.getComponentPath(); // => 'Application.Movie'
```

#### Typing

##### `getComponentType()` <badge type="secondary">class method</badge> {#get-component-type-class-method}

Returns the type of the component class. A component class type is composed of the component class name prefixed with the string `'typeof '`.

For example, with a component class named `'Movie'`, this method will return `'typeof Movie'`.

**Returns:**

A string.

**Example:**

```
Movie.getComponentType(); // => 'typeof Movie'
```

##### `getComponentType()` <badge type="secondary-outline">instance method</badge> {#get-component-type-instance-method}

Returns the type of the component instance. A component instance type is equivalent to the component class name.

For example, with a component class named `'Movie'`, this method will return `'Movie'` when called on a `Movie` instance.

**Returns:**

A string.

**Example:**

```
Movie.prototype.getComponentType(); // => 'Movie'

const movie = new Movie();
movie.getComponentType(); // => 'Movie'
```

#### isNew Mark

##### `getIsNewMark()` <badge type="secondary-outline">instance method</badge> {#get-is-new-mark-instance-method}

Returns whether the component instance is marked as new or not.

**Alias:**

`isNew()`

**Returns:**

A boolean.

**Example:**

```
let movie = new Movie();
movie.getIsNewMark(); // => true
```

##### `setIsNewMark(isNew)` <badge type="secondary-outline">instance method</badge> {#set-is-new-mark-instance-method}

Sets whether the component instance is marked as new or not.

**Parameters:**

* `isNew`: A boolean specifying if the component instance should be marked as new or not.

**Example:**

```
const movie = new Movie();
movie.getIsNewMark(); // => true
movie.setIsNewMark(false);
movie.getIsNewMark(); // => false
```

##### `isNew()` <badge type="secondary-outline">instance method</badge> {#is-new-instance-method}

Returns whether the component instance is marked as new or not.

**Returns:**

A boolean.

**Example:**

```
let movie = new Movie();
movie.isNew(); // => true
```

##### `markAsNew()` <badge type="secondary-outline">instance method</badge> {#mark-as-new-instance-method}

Marks the component instance as new.

This method is a shortcut for `setIsNewMark(true)`.

##### `markAsNotNew()` <badge type="secondary-outline">instance method</badge> {#mark-as-not-new-instance-method}

Marks the component instance as not new.

This method is a shortcut for `setIsNewMark(false)`.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.

#### Embeddability

##### `isEmbedded()` <badge type="secondary">class method</badge> {#is-embedded-class-method}

Returns whether the component is an [`EmbeddedComponent`](https://layrjs.com/docs/v2/reference/embedded-component).

**Returns:**

A boolean.

#### Properties

##### `getProperty(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-property-dual-method}

Gets a property of the component.

**Parameters:**

* `name`: The name of the property to get.

**Returns:**

An instance of a [`Property`](https://layrjs.com/docs/v2/reference/property) (or a subclass of [`Property`](https://layrjs.com/docs/v2/reference/property) such as [`Attribute`](https://layrjs.com/docs/v2/reference/attribute), [`Method`](https://layrjs.com/docs/v2/reference/method), etc.).

**Example:**

```
movie.getProperty('title'); // => 'title' attribute property
movie.getProperty('play'); // => 'play()' method property
```

##### `hasProperty(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-property-dual-method}

Returns whether the component has the specified property.

**Parameters:**

* `name`: The name of the property to check.

**Returns:**

A boolean.

**Example:**

```
movie.hasProperty('title'); // => true
movie.hasProperty('play'); // => true
movie.hasProperty('name'); // => false
```

##### `setProperty(name, PropertyClass, [propertyOptions])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-property-dual-method}

Defines a property in the component. Typically, instead of using this method, you would rather use a decorator such as [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) or [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator).

**Parameters:**

* `name`: The name of the property to define.
* `PropertyClass`: The class of the property (e.g., [`Attribute`](https://layrjs.com/docs/v2/reference/attribute), [`Method`](https://layrjs.com/docs/v2/reference/method)) to use.
* `propertyOptions`: The options to create the `PropertyClass`.

**Returns:**

The property that was created.

**Example:**

```
Movie.prototype.setProperty('title', Attribute, {valueType: 'string'});
```

##### `deleteProperty(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#delete-property-dual-method}

Removes a property from the component. If the specified property doesn't exist, nothing happens.

**Parameters:**

* `name`: The name of the property to remove.

**Returns:**

A boolean.

##### `getProperties([options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-properties-dual-method}

Returns an iterator providing the properties of the component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the properties to be returned. The function is invoked for each property with a [`Property`](https://layrjs.com/docs/v2/reference/property) instance as first argument.
  * `attributesOnly`: A boolean specifying whether only attribute properties should be returned (default: `false`).
  * `setAttributesOnly`: A boolean specifying whether only set attributes should be returned (default: `false`).
  * `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be returned (default: `true`, which means that all the attributes should be returned).
  * `methodsOnly`: A boolean specifying whether only method properties should be returned (default: `false`).

**Returns:**

A [`Property`](https://layrjs.com/docs/v2/reference/property) instance iterator.

**Example:**

```
for (const property of movie.getProperties()) {
  console.log(property.getName());
}

// Should output:
// title
// play
```

##### `getPropertyNames()` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-property-names-dual-method}

Returns the name of all the properties of the component.

**Returns:**

An array of the property names.

**Example:**

```
movie.getPropertyNames(); // => ['title', 'play']
```

#### Attribute Properties

##### `getAttribute(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-attribute-dual-method}

Gets an attribute of the component.

**Parameters:**

* `name`: The name of the attribute to get.

**Returns:**

An instance of [`Attribute`](https://layrjs.com/docs/v2/reference/attribute).

**Example:**

```
movie.getAttribute('title'); // => 'title' attribute property
movie.getAttribute('play'); // => Error ('play' is a method)
```

##### `hasAttribute(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-attribute-dual-method}

Returns whether the component has the specified attribute.

**Parameters:**

* `name`: The name of the attribute to check.

**Returns:**

A boolean.

**Example:**

```
movie.hasAttribute('title'); // => true
movie.hasAttribute('name'); // => false
movie.hasAttribute('play'); // => Error ('play' is a method)
```

##### `setAttribute(name, [attributeOptions])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-attribute-dual-method}

Defines an attribute in the component. Typically, instead of using this method, you would rather use the [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) decorator.

**Parameters:**

* `name`: The name of the attribute to define.
* `attributeOptions`: The options to create the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#constructor).

**Returns:**

The [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) that was created.

**Example:**

```
Movie.prototype.setAttribute('title', {valueType: 'string'});
```

##### `getAttributes([options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-attributes-dual-method}

Returns an iterator providing the attributes of the component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the attributes to be returned. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `setAttributesOnly`: A boolean specifying whether only set attributes should be returned (default: `false`).
  * `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be returned (default: `true`, which means that all the attributes should be returned).

**Returns:**

An [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance iterator.

**Example:**

```
for (const attr of movie.getAttributes()) {
  console.log(attr.getName());
}

// Should output:
// title
```

##### `getIdentifierAttribute(name)` <badge type="secondary-outline">instance method</badge> {#get-identifier-attribute-instance-method}

Gets an identifier attribute of the component.

**Parameters:**

* `name`: The name of the identifier attribute to get.

**Returns:**

An instance of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) or [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).

**Example:**

```
movie.getIdentifierAttribute('id'); // => 'id' primary identifier attribute
movie.getIdentifierAttribute('slug'); // => 'slug' secondary identifier attribute
```

##### `hasIdentifierAttribute(name)` <badge type="secondary-outline">instance method</badge> {#has-identifier-attribute-instance-method}

Returns whether the component has the specified identifier attribute.

**Parameters:**

* `name`: The name of the identifier attribute to check.

**Returns:**

A boolean.

**Example:**

```
movie.hasIdentifierAttribute('id'); // => true
movie.hasIdentifierAttribute('slug'); // => true
movie.hasIdentifierAttribute('name'); // => false (the property 'name' doesn't exist)
movie.hasIdentifierAttribute('title'); // => Error ('title' is not an identifier attribute)
```

##### `getPrimaryIdentifierAttribute()` <badge type="secondary-outline">instance method</badge> {#get-primary-identifier-attribute-instance-method}

Gets the primary identifier attribute of the component.

**Returns:**

An instance of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).

**Example:**

```
movie.getPrimaryIdentifierAttribute(); // => 'id' primary identifier attribute
```

##### `hasPrimaryIdentifierAttribute()` <badge type="secondary-outline">instance method</badge> {#has-primary-identifier-attribute-instance-method}

Returns whether the component as a primary identifier attribute.

**Returns:**

A boolean.

**Example:**

```
movie.hasPrimaryIdentifierAttribute(); // => true
```

##### `setPrimaryIdentifierAttribute(name, [attributeOptions])` <badge type="secondary-outline">instance method</badge> {#set-primary-identifier-attribute-instance-method}

Defines the primary identifier attribute of the component. Typically, instead of using this method, you would rather use the [`@primaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#primary-identifier-decorator) decorator.

**Parameters:**

* `name`: The name of the primary identifier attribute to define.
* `attributeOptions`: The options to create the [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).

**Returns:**

The [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) that was created.

**Example:**

```
User.prototype.setPrimaryIdentifierAttribute('id', {
  valueType: 'number',
  default() {
    return Math.random();
  }
});
```

##### `getSecondaryIdentifierAttribute(name)` <badge type="secondary-outline">instance method</badge> {#get-secondary-identifier-attribute-instance-method}

Gets a secondary identifier attribute of the component.

**Parameters:**

* `name`: The name of the secondary identifier attribute to get.

**Returns:**

A [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance.

**Example:**

```
movie.getSecondaryIdentifierAttribute('slug'); // => 'slug' secondary identifier attribute
movie.getSecondaryIdentifierAttribute('id'); // => Error ('id' is not a secondary identifier attribute)
```

##### `hasSecondaryIdentifierAttribute(name)` <badge type="secondary-outline">instance method</badge> {#has-secondary-identifier-attribute-instance-method}

Returns whether the component has the specified secondary identifier attribute.

**Parameters:**

* `name`: The name of the secondary identifier attribute to check.

**Returns:**

A boolean.

**Example:**

```
movie.hasSecondaryIdentifierAttribute('slug'); // => true
movie.hasSecondaryIdentifierAttribute('name'); // => false (the property 'name' doesn't exist)
movie.hasSecondaryIdentifierAttribute('id'); // => Error ('id' is not a secondary identifier attribute)
```

##### `setSecondaryIdentifierAttribute(name, [attributeOptions])` <badge type="secondary-outline">instance method</badge> {#set-secondary-identifier-attribute-instance-method}

Defines a secondary identifier attribute in the component. Typically, instead of using this method, you would rather use the [`@secondaryIdentifier()`](https://layrjs.com/docs/v2/reference/component#secondary-identifier-decorator) decorator.

**Parameters:**

* `name`: The name of the secondary identifier attribute to define.
* `attributeOptions`: The options to create the [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).

**Returns:**

The [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) that was created.

**Example:**

```
User.prototype.setSecondaryIdentifierAttribute('slug', {valueType: 'string'});
```

##### `getIdentifierAttributes([options])` <badge type="secondary-outline">instance method</badge> {#get-identifier-attributes-instance-method}

Returns an iterator providing the identifier attributes of the component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the identifier attributes to be returned. The function is invoked for each identifier attribute with an `IdentifierAttribute` instance as first argument.
  * `setAttributesOnly`: A boolean specifying whether only set identifier attributes should be returned (default: `false`).
  * `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the identifier attributes to be returned (default: `true`, which means that all identifier attributes should be returned).

**Returns:**

An iterator of [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute) or [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).

**Example:**

```
for (const attr of movie.getIdentifierAttributes()) {
  console.log(attr.getName());
}

// Should output:
// id
// slug
```

##### `getSecondaryIdentifierAttributes([options])` <badge type="secondary-outline">instance method</badge> {#get-secondary-identifier-attributes-instance-method}

Returns an iterator providing the secondary identifier attributes of the component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the secondary identifier attributes to be returned. The function is invoked for each identifier attribute with a [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance as first argument.
  * `setAttributesOnly`: A boolean specifying whether only set secondary identifier attributes should be returned (default: `false`).
  * `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the secondary identifier attributes to be returned (default: `true`, which means that all secondary identifier attributes should be returned).

**Returns:**

A [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute) instance iterator.

**Example:**

```
for (const attr of movie.getSecondaryIdentifierAttributes()) {
  console.log(attr.getName());
}

// Should output:
// slug
```

##### `getIdentifiers()` <badge type="secondary-outline">instance method</badge> {#get-identifiers-instance-method}

Returns an object composed of all the identifiers that are set in the component. The shape of the returned object is `{[identifierName]: identifierValue}`. Throws an error if the component doesn't have any set identifiers.

**Returns:**

An object.

**Example:**

```
movie.getIdentifiers(); // => {id: 'abc123', slug: 'inception'}
```

##### `hasIdentifiers()` <badge type="secondary-outline">instance method</badge> {#has-identifiers-instance-method}

Returns whether the component has an identifier that is set or not.

**Returns:**

A boolean.

**Example:**

```
movie.hasIdentifiers(); // => true
```

##### `generateId()` <badge type="secondary">class method</badge> {#generate-id-class-method}

Generates a unique identifier using the [cuid](https://github.com/ericelliott/cuid) library.

**Returns:**

The generated identifier.

**Example:**

```
Movie.generateId(); // => 'ck41vli1z00013h5xx1esffyn'
```

#### Identifier Descriptor

##### `getIdentifierDescriptor()` <badge type="secondary-outline">instance method</badge> {#get-identifier-descriptor-instance-method}

Returns the `IdentifierDescriptor` of the component.

An `IdentifierDescriptor` is a plain object composed of one pair of name/value corresponding to the name and value of the first identifier attribute encountered in a component. Usually it is the primary identifier, but if the primary identifier is not set, it can be a secondary identifier.

If there is no set identifier in the component, an error is thrown.

**Returns:**

An object.

**Example:**

```
movie.getIdentifierDescriptor(); // => {id: 'abc123'}
```

##### `hasIdentifierDescriptor()` <badge type="secondary-outline">instance method</badge> {#has-identifier-descriptor-instance-method}

Returns whether the component can provide an `IdentifierDescriptor` (using the [`getIdentifierDescriptor()`](https://layrjs.com/docs/v2/reference/component#get-identifier-descriptor-instance-method) method) or not.

**Returns:**

A boolean.

**Example:**

```
movie.hasIdentifierDescriptor(); // => true
```

#### Attribute Value Assignment

##### `assign(object, [options])` <badge type="secondary">class method</badge> {#assign-class-method}

Assigns the specified attribute values to the current component class.

**Parameters:**

* `object`: An object specifying the attribute values to assign.
* `options`:
  * `source`: A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the attribute values (default: `'local'`).

**Returns:**

The current component class.

**Example:**

```
import {Component, attribute} from '@layr/component';

class Application extends Component {
  @attribute('string') static language = 'en';
}

Application.language // => 'en'

Application.assign({language: 'fr'});

Application.language // => 'fr'
```

##### `assign(object, [options])` <badge type="secondary-outline">instance method</badge> {#assign-instance-method}

Assigns the specified attribute values to the current component instance.

**Parameters:**

* `object`: An object specifying the attribute values to assign.
* `options`:
  * `source`: A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the attribute values (default: `'local'`).

**Returns:**

The current component instance.

**Example:**

```
// JS

import {Component, attribute} from '@layr/component';

class Movie extends Component {
  @attribute('string') title;
  @attribute('number') rating;
}

const movie = new Movie({title: 'Inception', rating: 8.7});

movie.title // => 'Inception'
movie.rating // => 8.7

movie.assign({rating: 8.8});

movie.title // => 'Inception'
movie.rating // => 8.8
```
```
// TS

import {Component, attribute} from '@layr/component';

class Movie extends Component {
  @attribute('string') title!: string;
  @attribute('number') rating!: number;
}

const movie = new Movie({title: 'Inception', rating: 8.7});

movie.title // => 'Inception'
movie.rating // => 8.7

movie.assign({rating: 8.8});

movie.rating // => 8.8
```

#### Identity Mapping

##### `getIdentityMap()` <badge type="secondary">class method</badge> {#get-identity-map-class-method}

Gets the [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map) of the component.

**Returns:**

An [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map) instance.

##### `attach()` <badge type="secondary">class method</badge> {#attach-class-method}

Attaches the component class to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map). By default, all component classes are attached, so unless you have detached a component class earlier, you should not have to use this method.

**Returns:**

The component class.

##### `detach()` <badge type="secondary">class method</badge> {#detach-class-method}

Detaches the component class from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).

**Returns:**

The component class.

##### `isAttached()` <badge type="secondary">class method</badge> {#is-attached-class-method}

Returns whether the component class is attached to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).

**Returns:**

A boolean.

##### `isDetached()` <badge type="secondary">class method</badge> {#is-detached-class-method}

Returns whether the component class is detached from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).

**Returns:**

A boolean.

##### `attach()` <badge type="secondary-outline">instance method</badge> {#attach-instance-method}

Attaches the component instance to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map). By default, all component instances are attached, so unless you have detached a component instance earlier, you should not have to use this method.

**Returns:**

The component instance.

##### `detach()` <badge type="secondary-outline">instance method</badge> {#detach-instance-method}

Detaches the component instance from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).

**Returns:**

The component instance.

##### `isAttached()` <badge type="secondary-outline">instance method</badge> {#is-attached-instance-method}

Returns whether the component instance is attached to its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).

**Returns:**

A boolean.

##### `isDetached()` <badge type="secondary-outline">instance method</badge> {#is-detached-instance-method}

Returns whether the component instance is detached from its [`IdentityMap`](https://layrjs.com/docs/v2/reference/identity-map).

**Returns:**

A boolean.

#### Validation

##### `validate([attributeSelector])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#validate-dual-method}

Validates the attributes of the component. If an attribute doesn't pass the validation, an error is thrown. The error is a JavaScript `Error` instance with a `failedValidators` custom attribute which contains the result of the [`runValidators()`](https://layrjs.com/docs/v2/reference/component#run-validators-dual-method) method.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be validated (default: `true`, which means that all the attributes will be validated).

**Example:**

```
// JS

import {Component, attribute, validators} from '@layr/component';

const {notEmpty} = validators;

class Movie extends Component {
  @attribute('string', {validators: [notEmpty()]}) title;
}

const movie = new Movie({title: 'Inception'});

movie.title; // => 'Inception'
movie.validate(); // All good!
movie.title = '';
movie.validate(); // Error {failedValidators: [{validator: ..., path: 'title'}]}
```
```
// TS

import {Component, attribute, validators} from '@layr/component';

const {notEmpty} = validators;

class Movie extends Component {
  @attribute('string', {validators: [notEmpty()]}) title!: string;
}

const movie = new Movie({title: 'Inception'});

movie.title; // => 'Inception'
movie.validate(); // All good!
movie.title = '';
movie.validate(); // Error {failedValidators: [{validator: ..., path: 'title'}]}
```

##### `isValid([attributeSelector])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#is-valid-dual-method}

Returns whether the attributes of the component are valid.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be checked (default: `true`, which means that all the attributes will be checked).

**Returns:**

A boolean.

**Example:**

```
// See the `movie` definition in the `validate()` example

movie.title; // => 'Inception'
movie.isValid(); // => true
movie.title = '';
movie.isValid(); // => false
```

##### `runValidators([attributeSelector])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#run-validators-dual-method}

Runs the validators for all the set attributes of the component.

**Parameters:**

* `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be validated (default: `true`, which means that all the attributes will be validated).

**Returns:**

An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a [`Validator`](https://layrjs.com/docs/v2/reference/validator) instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).

**Example:**

```
// See the `movie` definition in the `validate()` example

movie.title; // => 'Inception'
movie.runValidators(); // => []
movie.title = '';
movie.runValidators(); // => [{validator: ..., path: 'title'}]
```

#### Method Properties

##### `getMethod(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-method-dual-method}

Gets a method of the component.

**Parameters:**

* `name`: The name of the method to get.

**Returns:**

A [`Method`](https://layrjs.com/docs/v2/reference/method) instance.

**Example:**

```
movie.getMethod('play'); // => 'play' method property
movie.getMethod('title'); // => Error ('title' is an attribute property)
```

##### `hasMethod(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-method-dual-method}

Returns whether the component has the specified method.

**Parameters:**

* `name`: The name of the method to check.

**Returns:**

A boolean.

**Example:**

```
movie.hasMethod('play'); // => true
movie.hasMethod('destroy'); // => false
movie.hasMethod('title'); // => Error ('title' is an attribute property)
```

##### `setMethod(name, [methodOptions])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-method-dual-method}

Defines a method in the component. Typically, instead of using this method, you would rather use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.

**Parameters:**

* `name`: The name of the method to define.
* `methodOptions`: The options to create the [`Method`](https://layrjs.com/docs/v2/reference/method#constructor).

**Returns:**

The [`Method`](https://layrjs.com/docs/v2/reference/method) that was created.

**Example:**

```
Movie.prototype.setMethod('play');
```

##### `getMethods([options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-methods-dual-method}

Returns an iterator providing the methods of the component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the methods to be returned. The function is invoked for each method with a [`Method`](https://layrjs.com/docs/v2/reference/method) instance as first argument.

**Returns:**

A [`Method`](https://layrjs.com/docs/v2/reference/method) instance iterator.

**Example:**

```
for (const meth of movie.getMethods()) {
  console.log(meth.getName());
}

// Should output:
// play
```

#### Dependency Management

##### `getComponent(name)` <badge type="secondary">class method</badge> {#get-component-class-method}

Gets a component class that is provided or consumed by the current component. An error is thrown if there is no component matching the specified name. If the specified name is the name of the current component, the latter is returned.

**Parameters:**

* `name`: The name of the component class to get.

**Returns:**

A component class.

**Example:**

```
class Application extends Component {
  @provide() static Movie = Movie;
}

Application.getComponent('Movie'); // => Movie
Application.getComponent('Application'); // => Application
```

##### `hasComponent(name)` <badge type="secondary">class method</badge> {#has-component-class-method}

Returns whether the current component provides or consumes another component.

**Parameters:**

* `name`: The name of the component class to check.

**Returns:**

A boolean.

**Example:**

```
class Application extends Component {
  @provide() static Movie = Movie;
}

Application.hasComponent('Movie'); // => true
Application.hasComponent('Application'); // => true
Application.hasComponent('Film'); // => false
```

##### `getComponentOfType(type)` <badge type="secondary">class method</badge> {#get-component-of-type-class-method}

Gets a component class or prototype of the specified type that is provided or consumed by the current component. An error is thrown if there is no component matching the specified type. If the specified type is the type of the current component, the latter is returned.

**Parameters:**

* `type`: The type of the component class or prototype to get.

**Returns:**

A component class or prototype.

**Example:**

```
class Application extends Component {
  @provide() static Movie = Movie;
}

Application.getComponentOfType('typeof Movie'); // => Movie
Application.getComponentOfType('Movie'); // => Movie.prototype
Application.getComponentOfType('typeof Application'); // => Application
Application.getComponentOfType('Application'); // => Application.prototype
```

##### `hasComponentOfType(type)` <badge type="secondary">class method</badge> {#has-component-of-type-class-method}

Returns whether the current component provides or consumes a component class or prototype matching the specified type.

**Parameters:**

* `type`: The type of the component class or prototype to check.

**Returns:**

A boolean.

**Example:**

```
class Application extends Component {
  @provide() static Movie = Movie;
}

Application.hasComponentOfType('typeof Movie'); // => true
Application.hasComponentOfType('Movie'); // => true
Application.hasComponentOfType('typeof Application'); // => true
Application.hasComponentOfType('Application'); // => true
Application.hasComponentOfType('typeof Film'); // => false
Application.hasComponentOfType('Film'); // => false
```

##### `getProvidedComponent(name)` <badge type="secondary">class method</badge> {#get-provided-component-class-method}

Gets a component that is provided by the current component. An error is thrown if there is no provided component with the specified name.

**Parameters:**

* `name`: The name of the provided component to get.

**Returns:**

A component class.

**Example:**

```
class Application extends Component {
  @provide() static Movie = Movie;
}

Application.getProvidedComponent('Movie'); // => Movie
```

##### `provideComponent(component)` <badge type="secondary">class method</badge> {#provide-component-class-method}

Specifies that the current component is providing another component so it can be easily accessed from the current component or from any component that is "consuming" it using the [`consumeComponent()`](https://layrjs.com/docs/v2/reference/component#consume-component-class-method) method or the [`@consume()`](https://layrjs.com/docs/v2/reference/component#consume-decorator) decorator.

The provided component can later be accessed using a component accessor that was automatically set on the component provider.

Typically, instead of using this method, you would rather use the [`@provide()`]((https://layrjs.com/docs/v2/reference/component#provide-decorator)) decorator.

**Parameters:**

* `component`: The component class to provide.

**Example:**

```
class Application extends Component {}
class Movie extends Component {}
Application.provideComponent(Movie);

Application.Movie; // => `Movie` class
```

##### `getProvidedComponents([options])` <badge type="secondary">class method</badge> {#get-provided-components-class-method}

Returns an iterator allowing to iterate over the components provided by the current component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the provided components to be returned. The function is invoked for each provided component with the provided component as first argument.
  * `deep`: A boolean specifying whether the method should get the provided components recursively (i.e., get the provided components of the provided components). Default: `false`.

**Returns:**

A component iterator.

##### `getComponentProvider()` <badge type="secondary">class method</badge> {#get-component-provider-class-method}

Returns the provider of the component. If there is no component provider, returns the current component.

**Returns:**

A component provider.

**Example:**

```
class Application extends Component {}
class Movie extends Component {}
Application.provideComponent(Movie);

Movie.getComponentProvider(); // => `Application` class
Application.getComponentProvider(); // => `Application` class
```

##### `getConsumedComponent(name)` <badge type="secondary">class method</badge> {#get-consumed-component-class-method}

Gets a component that is consumed by the current component. An error is thrown if there is no consumed component with the specified name. Typically, instead of using this method, you would rather use the component accessor that has been automatically set for you.

**Parameters:**

* `name`: The name of the consumed component to get.

**Returns:**

A component class.

**Example:**

```
// JS

class Movie extends Component {
  @consume() static Actor;
}

class Actor extends Component {}

class Application extends Component {
  @provide() static Movie = Movie;
  @provide() static Actor = Actor;
}

Movie.getConsumedComponent('Actor'); // => Actor

// Typically, you would rather use the component accessor:
Movie.Actor; // => Actor
```
```
// TS

class Movie extends Component {
  @consume() static Actor: typeof Actor;
}

class Actor extends Component {}

class Application extends Component {
  @provide() static Movie = Movie;
  @provide() static Actor = Actor;
}

Movie.getConsumedComponent('Actor'); // => Actor

// Typically, you would rather use the component accessor:
Movie.Actor; // => Actor
```

##### `consumeComponent(name)` <badge type="secondary">class method</badge> {#consume-component-class-method}

Specifies that the current component is consuming another component so it can be easily accessed using a component accessor.

Typically, instead of using this method, you would rather use the [`@consume()`]((https://layrjs.com/docs/v2/reference/component#consume-decorator)) decorator.

**Parameters:**

* `name`: The name of the component to consume.

**Example:**

```
class Application extends Component {}
class Movie extends Component {}
Application.provideComponent(Movie);
Movie.consumeComponent('Application');

Movie.Application; // => `Application` class
```

##### `getConsumedComponents([options])` <badge type="secondary">class method</badge> {#get-consumed-components-class-method}

Returns an iterator allowing to iterate over the components consumed by the current component.

**Parameters:**

* `options`:
  * `filter`: A function used to filter the consumed components to be returned. The function is invoked for each consumed component with the consumed component as first argument.

**Returns:**

A component iterator.

#### Cloning

##### `clone()` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#clone-instance-method}

Clones the component instance. All primitive attributes are copied, and embedded components are cloned recursively. Currently, identifiable components (i.e., components having an identifier attribute) cannot be cloned, but this might change in the future.

**Returns:**

A clone of the component.

**Example:**

```
movie.title = 'Inception';

const movieClone = movie.clone();
movieClone.title = 'Inception 2';

movieClone.title; // => 'Inception 2'
movie.title; // => 'Inception'
```

##### `clone(value)` <badge type="tertiary-outline">function</badge> <badge type="outline">possibly async</badge> {#clone-function}

Deeply clones any type of values including objects, arrays, and component instances (using Component's [`clone()`](https://layrjs.com/docs/v2/reference/component#clone-instance-method) instance method).

**Parameters:**

* `value`: A value of any type.

**Returns:**

A clone of the specified value.

**Example:**

```
import {clone} from '@layr/component';

const data = {
  token: 'xyz123',
  timestamp: 1596600889609,
  movie: new Movie({title: 'Inception'})
};

const dataClone = clone(data);
dataClone.token; // => 'xyz123';
dataClone.timestamp; // => 1596600889609
dataClone.movie; // => A clone of data.movie
```

#### Forking

##### `fork()` <badge type="secondary">class method</badge> {#fork-class-method}

Creates a fork of the component class.

**Returns:**

The component class fork.

**Example:**

```
class Movie extends Component {}

Movie.fork(); // => A fork of the `Movie` class
```

##### `fork()` <badge type="secondary-outline">instance method</badge> {#fork-instance-method}

Creates a fork of the component instance. Note that the constructor of the resulting component will be a fork of the component class.

**Returns:**

The component instance fork.

**Example:**

```
class Movie extends Component {}
const movie = new Movie();

movie.fork(); // => A fork of `movie`
movie.fork().constructor.isForkOf(Movie); // => true
```

##### `isForkOf()` <badge type="secondary">class method</badge> {#is-fork-of-class-method}

Returns whether the component class is a fork of another component class.

**Returns:**

A boolean.

**Example:**

```
class Movie extends Component {}
const MovieFork = Movie.fork();

MovieFork.isForkOf(Movie); // => true
Movie.isForkOf(MovieFork); // => false
```

##### `isForkOf()` <badge type="secondary-outline">instance method</badge> {#is-fork-of-instance-method}

Returns whether the component instance is a fork of another component instance.

**Returns:**

A boolean.

**Example:**

```
class Movie extends Component {}
const movie = new Movie();
const movieFork = movie.fork();

movieFork.isForkOf(movie); // => true
movie.isForkOf(movieFork); // => false
```

##### `getGhost()` <badge type="secondary">class method</badge> {#get-ghost-class-method}

Gets the ghost of the component class. A ghost is like a fork, but it is unique. The first time you call this method, a fork is created, and then, all the successive calls return the same fork.

**Returns:**

The ghost of the component class.

**Example:**

```
class Movie extends Component {}

Movie.getGhost() // => A fork of the `Movie` class
Movie.getGhost() // => The same fork of the `Movie` class
```

##### `getGhost()` <badge type="secondary-outline">instance method</badge> {#get-ghost-instance-method}

Gets the ghost of the component instance. A ghost is like a fork, but it is unique. The first time you call this method, a fork is created, and then, all the successive calls return the same fork. Only identifiable components (i.e., components having an identifier attribute) can be "ghosted".

**Returns:**

The ghost of the component instance.

**Example:**

```
// JS

class Movie extends Component {
  @primaryIdentifier() id;
}

const movie = new Movie();

movie.getGhost() // => A fork of `movie`
movie.getGhost() // => The same fork of `movie`
```
```
// TS

class Movie extends Component {
  @primaryIdentifier() id!: string;
}

const movie = new Movie();

movie.getGhost() // => A fork of `movie`
movie.getGhost() // => The same fork of `movie`
```

##### `fork(value)` <badge type="tertiary-outline">function</badge> {#fork-function}

Fork any type of values including objects, arrays, and components (using Component's `fork()` [class method](https://layrjs.com/docs/v2/reference/component#fork-class-method) and [instance method](https://layrjs.com/docs/v2/reference/component#fork-instance-method)).

**Parameters:**

* `value`: A value of any type.

**Returns:**

A fork of the specified value.

**Example:**

```
import {fork} from '@layr/component';

const data = {
  token: 'xyz123',
  timestamp: 1596600889609,
  movie: new Movie({title: 'Inception'})
};

const dataFork = fork(data);
Object.getPrototypeOf(dataFork); // => data
dataFork.token; // => 'xyz123';
dataFork.timestamp; // => 1596600889609
dataFork.movie.isForkOf(data.movie); // => true
```

#### Merging

##### `merge(componentFork)` <badge type="secondary">class method</badge> {#merge-class-method}

Merges the attributes of a component class fork into the current component class.

**Parameters:**

* `componentFork`: The component class fork to merge.

**Returns:**

The current component class.

**Example:**

```
class Movie extends Component {
  @attribute('string') static customName = 'Movie';
}

const MovieFork = Movie.fork();
MovieFork.customName = 'Film';

Movie.customName; // => 'Movie'
Movie.merge(MovieFork);
Movie.customName; // => 'Film'
```

##### `merge(componentFork)` <badge type="secondary-outline">instance method</badge> {#merge-instance-method}

Merges the attributes of a component instance fork into the current component instance.

**Parameters:**

* `componentFork`: The component instance fork to merge.

**Returns:**

The current component instance.

**Example:**

```
const movie = new Movie({title: 'Inception'});
const movieFork = movie.fork();
movieFork.title = 'Inception 2';

movie.title; // => 'Inception'
movie.merge(movieFork);
movie.title; // => 'Inception 2'
```

##### `merge(value, valueFork)` <badge type="tertiary-outline">function</badge> {#merge-function}

Deeply merge any type of forks including objects, arrays, and components (using Component's `merge()` [class method](https://layrjs.com/docs/v2/reference/component#merge-class-method) and [instance method](https://layrjs.com/docs/v2/reference/component#merge-instance-method)) into their original values.

**Parameters:**

* `value`: An original value of any type.
* `valueFork`: A fork of `value`.

**Returns:**

The original value.

**Example:**

```
import {fork, merge} from '@layr/component';

const data = {
  token: 'xyz123',
  timestamp: 1596600889609,
  movie: new Movie({title: 'Inception'})
};

const dataFork = fork(data);
dataFork.token = 'xyz456';
dataFork.movie.title = 'Inception 2';

data.token; // => 'xyz123'
data.movie.title; // => 'Inception'
merge(data, dataFork);
data.token; // => 'xyz456'
data.movie.title; // => 'Inception 2'
```

#### Serialization

##### `serialize([options])` <badge type="secondary">class method</badge> <badge type="outline">possibly async</badge> {#serialize-class-method}

Serializes the component class to a plain object.

**Parameters:**

* `options`:
  * `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be serialized (default: `true`, which means that all the attributes will be serialized).
  * `attributeFilter`: A (possibly async) function used to filter the attributes to be serialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `target`: A string specifying the [target](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `undefined`).

**Returns:**

A plain object representing the serialized component class.

**Example:**

```
class Movie extends Component {
  @attribute('string') static customName = 'Film';
}

Movie.serialize(); // => {__component: 'typeof Movie', customName: 'Film'}
```

##### `serialize([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#serialize-instance-method}

Serializes the component instance to a plain object.

**Parameters:**

* `options`:
  * `attributeSelector`: An [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the attributes to be serialized (default: `true`, which means that all the attributes will be serialized).
  * `attributeFilter`: A (possibly async) function used to filter the attributes to be serialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `target`: A string specifying the [target](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `undefined`).

**Returns:**

A plain object representing the serialized component instance.

**Example:**

```
const movie = new Movie({title: 'Inception'});

movie.serialize(); // => {__component: 'Movie', title: 'Inception'}
```

##### `serialize(value, [options])` <badge type="tertiary-outline">function</badge> <badge type="outline">possibly async</badge> {#serialize-function}

Serializes any type of values including objects, arrays, dates, and components (using Component's `serialize()` [class method](https://layrjs.com/docs/v2/reference/component#serialize-class-method) and [instance method](https://layrjs.com/docs/v2/reference/component#serialize-instance-method)).

**Parameters:**

* `value`: A value of any type.
* `options`:
  * `attributeFilter`: A (possibly async) function used to filter the component attributes to be serialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `target`: The target of the serialization (default: `undefined`).

**Returns:**

The serialized value.

**Example:**

```
import {serialize} from '@layr/component';

const data = {
  createdOn: new Date(),
  updatedOn: undefined,
  movie: new Movie({title: 'Inception'})
};

console.log(serialize(data));

// Should output something like:
// {
//   createdOn: {__date: "2020-07-18T23:43:33.778Z"},
//   updatedOn: {__undefined: true},
//   movie: {__component: 'Movie', title: 'Inception'}
// }
```

#### Deserialization

##### `deserialize([object], [options])` <badge type="secondary">class method</badge> <badge type="outline">possibly async</badge> {#deserialize-class-method}

Deserializes the component class from the specified plain object. The deserialization operates "in place", which means that the current component class attributes are mutated.

**Parameters:**

* `object`: The plain object to deserialize from.
* `options`:
  * `attributeFilter`: A (possibly async) function used to filter the attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `source`: A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `'local'`).

**Returns:**

The component class.

**Example:**

```
class Movie extends Component {
  @attribute('string') static customName = 'Movie';
}

Movie.customName; // => 'Movie'
Movie.deserialize({customName: 'Film'});
Movie.customName; // => 'Film'
```

##### `deserialize([object], [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#deserialize-instance-method}

Deserializes the component instance from the specified plain object. The deserialization operates "in place", which means that the current component instance attributes are mutated.

**Parameters:**

* `object`: The plain object to deserialize from.
* `options`:
  * `attributeFilter`: A (possibly async) function used to filter the attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `source`: A string specifying the [source](https://layrjs.com/docs/v2/reference/attribute#value-source-type) of the serialization (default: `'local'`).

**Returns:**

The current component instance.

**Example:**

```
class Movie extends Component {
  @attribute('string') title = '';
}

const movie = new Movie();

movie.title; // => ''
movie.deserialize({title: 'Inception'});
movie.title; // => 'Inception'
```

##### `deserialize(value, [options])` <badge type="tertiary-outline">function</badge> <badge type="outline">possibly async</badge> {#deserialize-function}

Deserializes any type of serialized values including objects, arrays, dates, and components.

**Parameters:**

* `value`: A serialized value.
* `options`:
  * `rootComponent`: The root component of your application.
  * `attributeFilter`: A (possibly async) function used to filter the component attributes to be deserialized. The function is invoked for each attribute with an [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance as first argument.
  * `source`: The source of the serialization (default: `'local'`).

**Returns:**

The deserialized value.

**Example:**

```
// JS

import {Component, deserialize} from '@layr/component';

class Movie extends Component {
  @attribute('string') title;
}

const serializedData = {
  createdOn: {__date: "2020-07-18T23:43:33.778Z"},
  updatedOn: {__undefined: true},
  movie: {__component: 'Movie', title: 'Inception'}
};

const data = deserialize(serializedData, {rootComponent: Movie});

data.createdOn; // => A Date instance
data.updatedOn; // => undefined
data.movie; // => A Movie instance
```
```
// TS

import {Component, deserialize} from '@layr/component';

class Movie extends Component {
  @attribute('string') title!: string;
}

const serializedData = {
  createdOn: {__date: "2020-07-18T23:43:33.778Z"},
  updatedOn: {__undefined: true},
  movie: {__component: 'Movie', title: 'Inception'}
};

const data = deserialize(serializedData, {rootComponent: Movie});

data.createdOn; // => A Date instance
data.updatedOn; // => undefined
data.movie; // => A Movie instance
```

#### Decorators

##### `@attribute([valueType], [options])` <badge type="tertiary">decorator</badge> {#attribute-decorator}

Decorates an attribute of a component so it can be type checked at runtime, validated, serialized, observed, etc.

**Parameters:**

* `valueType`: A string specifying the [type of values](https://layrjs.com/docs/v2/reference/value-type#supported-types) that can be stored in the attribute (default: `'any'`).
* `options`: The options to create the [`Attribute`](https://layrjs.com/docs/v2/reference/attribute#constructor).

**Example:**

```
// JS

import {Component, attribute, validators} from '@layr/component';

const {maxLength} = validators;

class Movie extends Component {
  // Optional 'string' class attribute
  @attribute('string?') static customName;

  // Required 'string' instance attribute
  @attribute('string') title;

  // Optional 'string' instance attribute with a validator
  @attribute('string?', {validators: [maxLength(100)]}) summary;

  // Required array of 'Actor' instance attribute with a default value
  @attribute('Actor[]') actors = [];
}
```
```
// TS

import {Component, attribute, validators} from '@layr/component';

const {maxLength} = validators;

class Movie extends Component {
  // Optional 'string' class attribute
  @attribute('string?') static customName?: string;

  // Required 'string' instance attribute
  @attribute('string') title!: string;

  // Optional 'string' instance attribute with a validator
  @attribute('string?', {validators: [maxLength(100)]}) summary?: string;

  // Required array of 'Actor' instance attribute with a default value
  @attribute('Actor[]') actors: Actor[] = [];
}
```

##### `@primaryIdentifier([valueType], [options])` <badge type="tertiary">decorator</badge> {#primary-identifier-decorator}

Decorates an attribute of a component as a [primary identifier attribute](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).

**Parameters:**

* `valueType`: A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
* `options`: The options to create the [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/primary-identifier-attribute).

**Example:**

```
// JS

import {Component, primaryIdentifier} from '@layr/component';

class Movie extends Component {
  // Auto-generated 'string' primary identifier attribute
  @primaryIdentifier('string') id;
}

class Film extends Component {
  // Custom 'number' primary identifier attribute
  @primaryIdentifier('number', {default() { return Math.random(); }}) id;
}
```
```
// TS

import {Component, primaryIdentifier} from '@layr/component';

class Movie extends Component {
  // Auto-generated 'string' primary identifier attribute
  @primaryIdentifier('string') id!: string;
}

class Film extends Component {
  // Custom 'number' primary identifier attribute
  @primaryIdentifier('number', {default() { return Math.random(); }}) id!: number;
}
```

##### `@secondaryIdentifier([valueType], [options])` <badge type="tertiary">decorator</badge> {#secondary-identifier-decorator}

Decorates an attribute of a component as a [secondary identifier attribute](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).

**Parameters:**

* `valueType`: A string specifying the type of values the attribute can store. It can be either `'string'` or `'number'` (default: `'string'`).
* `options`: The options to create the [`SecondaryIdentifierAttribute`](https://layrjs.com/docs/v2/reference/secondary-identifier-attribute).

**Example:**

```
// JS

import {Component, secondaryIdentifier} from '@layr/component';

class Movie extends Component {
  // 'string' secondary identifier attribute
  @secondaryIdentifier('string') slug;

  // 'number' secondary identifier attribute
  @secondaryIdentifier('number') reference;
}
```
```
// TS

import {Component, secondaryIdentifier} from '@layr/component';

class Movie extends Component {
  // 'string' secondary identifier attribute
  @secondaryIdentifier('string') slug!: string;

  // 'number' secondary identifier attribute
  @secondaryIdentifier('number') reference!: number;
}
```

##### `@method([options])` <badge type="tertiary">decorator</badge> {#method-decorator}

Decorates a method of a component so it can be exposed and called remotely.

**Parameters:**

* `options`: The options to create the [`Method`](https://layrjs.com/docs/v2/reference/method#constructor).

**Example:**

```
import {Component, method} from '@layr/component';

class Movie extends Component {
  // Class method
  @method() static getConfig() {
    // ...
  }

  // Instance method
  @method() play() {
    // ...
  }
}
```

##### `@expose(exposure)` <badge type="tertiary">decorator</badge> {#expose-decorator}

Exposes some attributes or methods of a component so they can be consumed remotely.

This decorator is usually placed before a component attribute or method, but it can also be placed before a component class. When placed before a component class, you can expose several attributes or methods at once, and even better, you can expose attributes or methods that are defined in a parent class.

**Parameters:**

* `exposure`: An object specifying which operations should be exposed. When the decorator is placed before a component attribute or method, the object is of type [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type). When the decorator is placed before a component class, the shape of the object is `{[propertyName]: PropertyExposure, prototype: {[propertyName]: PropertyExposure}}`.

**Example:**

```
// JS

import {Component, expose, attribute, method} from '@layr/component';

class Movie extends Component {
  // Class attribute exposing the 'get' operation only
  @expose({get: true}) @attribute('string?') static customName;

  // Instance attribute exposing the 'get' and 'set' operations
  @expose({get: true, set: true}) @attribute('string') title;

  // Class method exposure
  @expose({call: true}) @method() static getConfig() {
    // ...
  }

  // Instance method exposure
  @expose({call: true}) @method() play() {
    // ...
  }
}

// Exposing some class and instance methods that are defined in a parent class
@expose({find: {call: true}, prototype: {load: {call: true}}})
class Actor extends Storable(Component) {
  // ...
}
```
```
// TS

import {Component, expose, attribute, method} from '@layr/component';

class Movie extends Component {
  // Class attribute exposing the 'get' operation only
  @expose({get: true}) @attribute('string?') static customName?: string;

  // Instance attribute exposing the 'get' and 'set' operations
  @expose({get: true, set: true}) @attribute('string') title!: string;

  // Class method exposure
  @expose({call: true}) @method() static getConfig() {
    // ...
  }

  // Instance method exposure
  @expose({call: true}) @method() play() {
    // ...
  }
}

// Exposing some class and instance methods that are defined in a parent class
@expose({find: {call: true}, prototype: {load: {call: true}}})
class Actor extends Storable(Component) {
  // ...
}
```

##### `@provide()` <badge type="tertiary">decorator</badge> {#provide-decorator}

Provides a component so it can be easily accessed from the current component or from any component that is "consuming" it using the [`@consume()`](https://layrjs.com/docs/v2/reference/component#consume-decorator) decorator.

**Example:**

```
// JS

import {Component, provide, consume} from '@layr/component';

class Movie extends Component {
  @consume() static Actor;
}

class Actor extends Component {}

class Application extends Component {
  @provide() static Movie = Movie;
  @provide() static Actor = Actor;
}

// Since `Actor` is provided by `Application`, it can be accessed from `Movie`
Movie.Actor; // => Actor
```
```
// TS

import {Component, provide, consume} from '@layr/component';

class Movie extends Component {
  @consume() static Actor: typeof Actor;
}

class Actor extends Component {}

class Application extends Component {
  @provide() static Movie = Movie;
  @provide() static Actor = Actor;
}

// Since `Actor` is provided by `Application`, it can be accessed from `Movie`
Movie.Actor; // => Actor
```

##### `@consume()` <badge type="tertiary">decorator</badge> {#consume-decorator}

Consumes a component provided by the provider (or recursively, any provider's provider) of the current component so it can be easily accessed using a component accessor.

**Example:**

See [`@provide()`'s example](https://layrjs.com/docs/v2/reference/component#provide-decorator).
#### Utilities

##### `isComponentClass(value)` <badge type="tertiary-outline">function</badge> {#is-component-class-function}

Returns whether the specified value is a component class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isComponentInstance(value)` <badge type="tertiary-outline">function</badge> {#is-component-instance-function}

Returns whether the specified value is a component instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isComponentClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#is-component-class-or-instance-function}

Returns whether the specified value is a component class or instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `assertIsComponentClass(value)` <badge type="tertiary-outline">function</badge> {#assert-is-component-class-function}

Throws an error if the specified value is not a component class.

**Parameters:**

* `value`: A value of any type.

##### `assertIsComponentInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-component-instance-function}

Throws an error if the specified value is not a component instance.

**Parameters:**

* `value`: A value of any type.

##### `assertIsComponentClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-component-class-or-instance-function}

Throws an error if the specified value is not a component class or instance.

**Parameters:**

* `value`: A value of any type.

##### `ensureComponentClass(component)` <badge type="tertiary-outline">function</badge> {#ensure-component-class-function}

Ensures that the specified component is a class. If you specify a component instance (or prototype), the class of the component is returned. If you specify a component class, it is returned as is.

**Parameters:**

* `component`: A component class or instance.

**Returns:**

A component class.

**Example:**

```
ensureComponentClass(movie) => Movie
ensureComponentClass(Movie.prototype) => Movie
ensureComponentClass(Movie) => Movie
```

##### `ensureComponentInstance(component)` <badge type="tertiary-outline">function</badge> {#ensure-component-instance-function}

Ensures that the specified component is an instance (or prototype). If you specify a component class, the component prototype is returned. If you specify a component instance (or prototype), it is returned as is.

**Parameters:**

* `component`: A component class or instance.

**Returns:**

A component instance (or prototype).

**Example:**

```
ensureComponentInstance(Movie) => Movie.prototype
ensureComponentInstance(Movie.prototype) => Movie.prototype
ensureComponentInstance(movie) => movie
```

##### `isComponentName(name)` <badge type="tertiary-outline">function</badge> {#is-component-name-function}

Returns whether the specified string is a valid component name. The rule is the same as for typical JavaScript class names.

**Parameters:**

* `name`: The string to check.

**Returns:**

A boolean.

**Example:**

```
isComponentName('Movie') => true
isComponentName('Movie123') => true
isComponentName('Awesome_Movie') => true
isComponentName('123Movie') => false
isComponentName('Awesome-Movie') => false
isComponentName('movie') => false
```

##### `assertIsComponentName(name)` <badge type="tertiary-outline">function</badge> {#assert-is-component-name-function}

Throws an error if the specified string is not a valid component name.

**Parameters:**

* `name`: The string to check.

##### `getComponentNameFromComponentClassType(name)` <badge type="tertiary-outline">function</badge> {#get-component-name-from-component-class-type-function}

Transforms a component class type into a component name.

**Parameters:**

* `name`: A string representing a component class type.

**Returns:**

A component name.

**Example:**

```
getComponentNameFromComponentClassType('typeof Movie') => 'Movie'
```

##### `getComponentNameFromComponentInstanceType(name)` <badge type="tertiary-outline">function</badge> {#get-component-name-from-component-instance-type-function}

Transforms a component instance type into a component name.

**Parameters:**

* `name`: A string representing a component instance type.

**Returns:**

A component name.

**Example:**

```
getComponentNameFromComponentInstanceType('Movie') => 'Movie'
```

##### `isComponentType(name, [options])` <badge type="tertiary-outline">function</badge> {#is-component-type-function}

Returns whether the specified string is a valid component type.

**Parameters:**

* `name`: The string to check.
* `options`:
  * `allowClasses`: A boolean specifying whether component class types are allowed (default: `true`).
  * `allowInstances`: A boolean specifying whether component instance types are allowed (default: `true`).

**Returns:**

A boolean.

**Example:**

```
isComponentType('typeof Movie') => true
isComponentType('Movie') => true
isComponentType('typeof Awesome-Movie') => false
isComponentType('movie') => false
isComponentType('typeof Movie', {allowClasses: false}) => false
isComponentType('Movie', {allowInstances: false}) => false
```

##### `assertIsComponentType(name, [options])` <badge type="tertiary-outline">function</badge> {#assert-is-component-type-function}

Throws an error if the specified string is not a valid component type.

**Parameters:**

* `name`: The string to check.
* `options`:
  * `allowClasses`: A boolean specifying whether component class types are allowed (default: `true`).
  * `allowInstances`: A boolean specifying whether component instance types are allowed (default: `true`).

##### `getComponentClassTypeFromComponentName(name)` <badge type="tertiary-outline">function</badge> {#get-component-class-type-from-component-name-function}

Transforms a component name into a component class type.

**Parameters:**

* `name`: A component name.

**Returns:**

A component class type.

**Example:**

```
getComponentClassTypeFromComponentName('Movie') => 'typeof Movie'
```

##### `getComponentInstanceTypeFromComponentName(name)` <badge type="tertiary-outline">function</badge> {#get-component-instance-type-from-component-name-function}

Transforms a component name into a component instance type.

**Parameters:**

* `name`: A component name.

**Returns:**

A component instance type.

**Example:**

```
getComponentInstanceTypeFromComponentName('Movie') => 'Movie'
```
