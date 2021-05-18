### Method <badge type="primary">class</badge> {#method-class}

*Inherits from [`Property`](https://layrjs.com/docs/v1/reference/property).*

A `Method` represents a method of a [Component](https://layrjs.com/docs/v1/reference/component) class, prototype, or instance. It plays the role of a regular JavaScript method, but brings the ability to be exposed to remote calls.

#### Usage

Typically, you define a `Method` using the [`@method()`](https://layrjs.com/docs/v1/reference/component#method-decorator) decorator.

For example, here is how you would define a `Movie` class with some methods:

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

Then you can call a method like you would normally do with regular JavaScript:

```
Movie.getConfig();

const movie = new Movie({title: 'Inception'});
movie.play();
```

So far, you may wonder what is the point of defining methods this way. By itself the [`@method()`](https://layrjs.com/docs/v1/reference/component#method-decorator) decorator, except for creating a `Method` instance under the hood, doesn't provide much benefit.

The trick is that since you have a `Method`, you also have a [`Property`](https://layrjs.com/docs/v1/reference/property) (because `Method` inherits from `Property`), and properties can be exposed to remote access thanks to the [`@expose()`](https://layrjs.com/docs/v1/reference/component#expose-decorator) decorator.

So here is how you would expose the `Movie` methods:

```
import {Component, method} from '@layr/component';

class Movie extends Component {
  // Exposed class method
  @expose({call: true}) @method() static getConfig() {
    // ...
  }

  // Exposed instance method
  @expose({call: true}) @method() play() {
    // ...
  }
}
```

Now that you have some exposed methods, you can call them remotely in the same way you would do locally:

```
Movie.getConfig(); // Executed remotely

const movie = new Movie({title: 'Inception'});
movie.play();  // Executed remotely
```

#### Creation

##### `new Method(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Method`](https://layrjs.com/docs/v1/reference/method). Typically, instead of using this constructor, you would rather use the [`@method()`](https://layrjs.com/docs/v1/reference/component#method-decorator) decorator.

**Parameters:**

* `name`: The name of the method.
* `parent`: The component class, prototype, or instance that owns the method.
* `options`:
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v1/reference/property#property-exposure-type) object specifying how the method should be exposed to remote calls.

**Returns:**

The [`Method`](https://layrjs.com/docs/v1/reference/method) instance that was created.

**Example:**

```
import {Component, Method} from '@layr/component';

class Movie extends Component {}

const play = new Method('play', Movie.prototype, {exposure: {call: true}});

play.getName(); // => 'play'
play.getParent(); // => Movie.prototype
play.getExposure(); // => {call: true}
```

#### Methods

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v1/reference/property#basic-methods) class.

#### Utilities

##### `isMethodClass(value)` <badge type="tertiary-outline">function</badge> {#is-method-class-function}

Returns whether the specified value is a `Method` class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isMethodInstance(value)` <badge type="tertiary-outline">function</badge> {#is-method-instance-function}

Returns whether the specified value is a `Method` instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
