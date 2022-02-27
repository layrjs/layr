### Attribute <badge type="primary">class</badge> {#attribute-class}

*Inherits from [`Property`](https://layrjs.com/docs/v2/reference/property) and [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class).*

An `Attribute` represents an attribute of a [Component](https://layrjs.com/docs/v2/reference/component) class, prototype, or instance. It plays the role of a regular JavaScript object attribute, but brings some extra features such as runtime type checking, validation, serialization, or observability.

#### Usage

Typically, you create an `Attribute` and associate it to a component by using the [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) decorator.

For example, here is how you would define a `Movie` class with some attributes:

```
// JS

import {Component, attribute, validators} from '@layr/component';

const {minLength} = validators;

class Movie extends Component {
  // Optional 'string' class attribute
  @attribute('string?') static customName;

  // Required 'string' instance attribute
  @attribute('string') title;

  // Optional 'string' instance attribute with a validator and a default value
  @attribute('string?', {validators: [minLength(16)]}) summary = '';
}
```

```
// TS

import {Component, attribute, validators} from '@layr/component';

const {minLength} = validators;

class Movie extends Component {
  // Optional 'string' class attribute
  @attribute('string?') static customName?: string;

  // Required 'string' instance attribute
  @attribute('string') title!: string;

  // Optional 'string' instance attribute with a validator and a default value
  @attribute('string?', {validators: [minLength(16)]}) summary? = '';
}
```

Then you can access the attributes like you would normally do with regular JavaScript objects:

```
Movie.customName = 'Film';
Movie.customName; // => 'Film'

const movie = new Movie({title: 'Inception'});
movie.title; // => 'Inception'
movie.title = 'Inception 2';
movie.title; // => 'Inception 2'
movie.summary; // => '' (default value)
```

And you can take profit of some extra features:

```
// Runtime type checking
movie.title = 123; // Error
movie.title = undefined; // Error

// Validation
movie.summary = undefined;
movie.isValid(); // => true (movie.summary is optional)
movie.summary = 'A nice movie.';
movie.isValid(); // => false (movie.summary is too short)
movie.summary = 'An awesome movie.'
movie.isValid(); // => true

// Serialization
movie.serialize();
// => {__component: 'Movie', title: 'Inception 2', summary: 'An awesome movie.'}
```

#### Creation

##### `new Attribute(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Attribute`](https://layrjs.com/docs/v2/reference/attribute). Typically, instead of using this constructor, you would rather use the [`@attribute()`](https://layrjs.com/docs/v2/reference/component#attribute-decorator) decorator.

**Parameters:**

* `name`: The name of the attribute.
* `parent`: The component class, prototype, or instance that owns the attribute.
* `options`:
  * `valueType`: A string specifying the [type of values](https://layrjs.com/docs/v2/reference/value-type#supported-types) the attribute can store (default: `'any'`).
  * `value`: The initial value of the attribute (usable for class attributes only).
  * `default`: The default value (or a function returning the default value) of the attribute (usable for instance attributes only).
  * `sanitizers`: An array of [sanitizers](https://layrjs.com/docs/v2/reference/sanitizer) for the value of the attribute.
  * `validators`: An array of [validators](https://layrjs.com/docs/v2/reference/validator) for the value of the attribute.
  * `items`:
    * `sanitizers`: An array of [sanitizers](https://layrjs.com/docs/v2/reference/sanitizer) for the items of an array attribute.
    * `validators`: An array of [validators](https://layrjs.com/docs/v2/reference/validator) for the items of an array attribute.
  * `getter`: A getter function for getting the value of the attribute. Plays the same role as a regular [JavaScript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get).
  * `setter`: A setter function for setting the value of the attribute. Plays the same role as a regular [JavaScript setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set).
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.

**Returns:**

The [`Attribute`](https://layrjs.com/docs/v2/reference/attribute) instance that was created.

**Example:**

```
import {Component, Attribute} from '@layr/component';

class Movie extends Component {}

const title = new Attribute('title', Movie.prototype, {valueType: 'string'});

title.getName(); // => 'title'
title.getParent(); // => Movie.prototype
title.getValueType().toString(); // => 'string'
```

#### Property Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Value Type

##### `getValueType()` <badge type="secondary-outline">instance method</badge> {#get-value-type-instance-method}

Returns the type of values the attribute can store.

**Returns:**

A [ValueType](https://layrjs.com/docs/v2/reference/value-type) instance.

**Example:**

```
const title = Movie.prototype.getAttribute('title');
title.getValueType(); // => A ValueType instance
title.getValueType().toString(); // => 'string'
title.getValueType().isOptional(); // => false
```

#### Value

##### `getValue([options])` <badge type="secondary-outline">instance method</badge> {#get-value-instance-method}

Returns the current value of the attribute.

**Parameters:**

* `options`:
  * `throwIfUnset`: A boolean specifying whether the method should throw an error if the value is not set (default: `true`). If `false` is specified and the value is not set, the method returns `undefined`.

**Returns:**

A value of the type handled by the attribute.

**Example:**

```
const title = movie.getAttribute('title');
title.getValue(); // => 'Inception'
title.unsetValue();
title.getValue(); // => Error
title.getValue({throwIfUnset: false}); // => undefined
```

##### `setValue(value, [options])` <badge type="secondary-outline">instance method</badge> {#set-value-instance-method}

Sets the value of the attribute. If the type of the value doesn't match the expected type, an error is thrown.

When the attribute's value changes, the observers of the attribute are automatically executed, and the observers of the parent component are executed as well.

**Parameters:**

* `value`: The value to be set.
* `options`:
  * `source`: A string specifying the [source of the value](https://layrjs.com/docs/v2/reference/attribute#value-source-type) (default: `'local'`).

**Example:**

```
const title = movie.getAttribute('title');
title.setValue('Inception 2');
title.setValue(123); // => Error
```

##### `unsetValue()` <badge type="secondary-outline">instance method</badge> {#unset-value-instance-method}

Unsets the value of the attribute. If the value is already unset, nothing happens.

**Example:**

```
const title = movie.getAttribute('title');
title.isSet(); // => true
title.unsetValue();
title.isSet(); // => false
```

##### `isSet()` <badge type="secondary-outline">instance method</badge> {#is-set-instance-method}

Returns whether the value of the attribute is set or not.

**Returns:**

A boolean.

**Example:**

```
const title = movie.getAttribute('title');
title.isSet(); // => true
title.unsetValue();
title.isSet(); // => false
```

#### Value Source

##### `getValueSource()` <badge type="secondary-outline">instance method</badge> {#get-value-source-instance-method}

Returns the source of the value of the attribute.

**Returns:**

A [`ValueSource`](https://layrjs.com/docs/v2/reference/attribute#value-source-type) string.

**Example:**

```
const title = movie.getAttribute('title');
title.getValueSource(); // => 'local' (the value was set locally)
```

##### `setValueSource(source)` <badge type="secondary-outline">instance method</badge> {#set-value-source-instance-method}

Sets the source of the value of the attribute.

**Parameters:**

* `source`: A [`ValueSource`](https://layrjs.com/docs/v2/reference/attribute#value-source-type) string.

**Example:**

```
const title = movie.getAttribute('title');
title.setValueSource('local'); // The value was set locally
title.setValueSource('server'); // The value came from an upper layer
title.setValueSource('client'); // The value came from a lower layer
```

##### `ValueSource` <badge type="primary-outline">type</badge> {#value-source-type}

A string representing the source of a value.

Currently, four types of sources are supported:

* `'server'`: The value comes from an upper layer.
* `'store'`: The value comes from a store.
* `'local'`: The value comes from the current layer.
* `'client'`: The value comes from a lower layer.

#### Default Value

##### `getDefault()` <badge type="secondary-outline">instance method</badge> {#get-default-instance-method}

Returns the default value of the attribute as specified when the attribute was created.

**Returns:**

A value or a function returning a value.

**Example:**

```
const summary = movie.getAttribute('summary');
summary.getDefault(); // => function () { return ''; }
```

##### `evaluateDefault()` <badge type="secondary-outline">instance method</badge> {#evaluate-default-instance-method}

Evaluate the default value of the attribute. If the default value is a function, the function is called (with the attribute's parent as `this` context), and the result is returned. Otherwise, the default value is returned as is.

**Returns:**

A value of any type.

**Example:**

```
const summary = movie.getAttribute('summary');
summary.evaluateDefault(); // ''
```

#### Validation

##### `validate([attributeSelector])` <badge type="secondary-outline">instance method</badge> {#validate-instance-method}

Validates the value of the attribute. If the value doesn't pass the validation, an error is thrown. The error is a JavaScript `Error` instance with a `failedValidators` custom attribute which contains the result of the [`runValidators()`](https://layrjs.com/docs/v2/reference/attribute#run-validators-instance-method) method.

**Parameters:**

* `attributeSelector`: In case the value of the attribute is a component, your can pass an [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the component's attributes to be validated (default: `true`, which means that all the component's attributes will be validated).

**Example:**

```
// JS

import {Component, attribute, validators} from '@layr/component';

const {notEmpty} = validators;

class Movie extends Component {
  @attribute('string', {validators: [notEmpty()]}) title;
}

const movie = new Movie({title: 'Inception'});
const title = movie.getAttribute('title');

title.getValue(); // => 'Inception'
title.validate(); // All good!
title.setValue('');
title.validate(); // => Error {failedValidators: [{validator: ..., path: ''}]}
```
```
// TS

import {Component, attribute, validators} from '@layr/component';

const {notEmpty} = validators;

class Movie extends Component {
  @attribute('string', {validators: [notEmpty()]}) title!: string;
}

const movie = new Movie({title: 'Inception'});
const title = movie.getAttribute('title');

title.getValue(); // => 'Inception'
title.validate(); // All good!
title.setValue('');
title.validate(); // => Error {failedValidators: [{validator: ..., path: ''}]}
```

##### `isValid([attributeSelector])` <badge type="secondary-outline">instance method</badge> {#is-valid-instance-method}

Returns whether the value of the attribute is valid.

**Parameters:**

* `attributeSelector`: In case the value of the attribute is a component, your can pass an [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the component's attributes to be validated (default: `true`, which means that all the component's attributes will be validated).

**Returns:**

A boolean.

**Example:**

```
// See the `title` definition in the `validate()` example

title.getValue(); // => 'Inception'
title.isValid(); // => true
title.setValue('');
title.isValid(); // => false
```

##### `runValidators([attributeSelector])` <badge type="secondary-outline">instance method</badge> {#run-validators-instance-method}

Runs the validators with the value of the attribute.

**Parameters:**

* `attributeSelector`: In case the value of the attribute is a component, your can pass an [`AttributeSelector`](https://layrjs.com/docs/v2/reference/attribute-selector) specifying the component's attributes to be validated (default: `true`, which means that all the component's attributes will be validated).

**Returns:**

An array containing the validators that have failed. Each item is a plain object composed of a `validator` (a [`Validator`](https://layrjs.com/docs/v2/reference/validator) instance) and a `path` (a string representing the path of the attribute containing the validator that has failed).

**Example:**

```
// See the `title` definition in the `validate()` example

title.getValue(); // => 'Inception'
title.runValidators(); // => []
title.setValue('');
title.runValidators(); // => [{validator: ..., path: ''}]
```

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.

#### Utilities

##### `isAttributeClass(value)` <badge type="tertiary-outline">function</badge> {#is-attribute-class-function}

Returns whether the specified value is an `Attribute` class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isAttributeInstance(value)` <badge type="tertiary-outline">function</badge> {#is-attribute-instance-function}

Returns whether the specified value is an `Attribute` instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
