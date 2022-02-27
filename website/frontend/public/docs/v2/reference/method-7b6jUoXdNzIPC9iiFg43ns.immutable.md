### Method <badge type="primary">class</badge> {#method-class}

*Inherits from [`Property`](https://layrjs.com/docs/v2/reference/property).*

A `Method` represents a method of a [Component](https://layrjs.com/docs/v2/reference/component) class, prototype, or instance. It plays the role of a regular JavaScript method, but brings some extra features such as remote invocation, scheduled execution, or queuing.

#### Usage

Typically, you define a `Method` using the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.

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

So far, you may wonder what is the point of defining methods this way. By itself the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator, except for creating a `Method` instance under the hood, doesn't provide much benefit.

The trick is that since you have a `Method`, you also have a [`Property`](https://layrjs.com/docs/v2/reference/property) (because `Method` inherits from `Property`), and properties can be exposed to remote access thanks to the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) decorator.

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

In addition, you can easily take advantage of some powerful features offered by [`Methods`](https://layrjs.com/docs/v2/reference/method). For example, here is how you would define a method that is automatically executed every hour:

```
class Application extends Component {
  @method({schedule: {rate: 60 * 60 * 1000}}) static async runHourlyTask() {
    // Do something every hour...
  }
}
```

#### Creation

##### `new Method(name, parent, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Method`](https://layrjs.com/docs/v2/reference/method). Typically, instead of using this constructor, you would rather use the [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorator.

**Parameters:**

* `name`: The name of the method.
* `parent`: The component class, prototype, or instance that owns the method.
* `options`:
  * `exposure`: A [`PropertyExposure`](https://layrjs.com/docs/v2/reference/property#property-exposure-type) object specifying how the method should be exposed to remote calls.
  * `schedule`: A [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object specifying how the method should be scheduled for automatic execution. Note that only static methods can be scheduled.

**Returns:**

The [`Method`](https://layrjs.com/docs/v2/reference/method) instance that was created.

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

See the methods that are inherited from the [`Property`](https://layrjs.com/docs/v2/reference/property#basic-methods) class.

#### Scheduling

##### `getScheduling()` <badge type="secondary-outline">instance method</badge> {#get-scheduling-instance-method}

If the method is scheduled for automatic execution, returns a [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object. Otherwise, returns `undefined`.

**Returns:**

A [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object or `undefined`.

**Example:**

```
runHourlyTaskMethod.getScheduling(); // => {rate: 60 * 60 * 1000}
regularMethod.getScheduling(); // => undefined
```

##### `setScheduling(scheduling)` <badge type="secondary-outline">instance method</badge> {#set-scheduling-instance-method}

Sets how the method should be scheduled for automatic execution. Note that only static methods can be scheduled.

**Parameters:**

* `scheduling`: A [`MethodScheduling`](https://layrjs.com/docs/v2/reference/method#method-scheduling-type) object.

**Example:**

```
runHourlyTaskMethod.setScheduling({rate: 60 * 60 * 1000});
```

##### `MethodScheduling` <badge type="primary-outline">type</badge> {#method-scheduling-type}

A `MethodScheduling` is a plain object specifying how a method is scheduled for automatic execution. The shape of the object is `{rate: number}` where `rate` is the execution frequency expressed in milliseconds.

**Example:**

```
{rate: 60 * 1000} // Every minute
{rate: 60 * 60 * 1000} // Every hour
{rate: 24 * 60 * 60 * 1000} // Every day
```

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
