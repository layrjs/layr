### Observable() <badge type="primary">mixin</badge> {#observable-mixin}

Brings observability to any class.

This mixin is used to construct several Layr's classes such as [`Component`](https://layrjs.com/docs/v1/reference/component) or [`Attribute`](https://layrjs.com/docs/v1/reference/attribute). So, in most cases, you'll have the capabilities provided by this mixin without having to call it.

#### Usage

Call the `Observable()` mixin with any class to construct an [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class. Then, you can add some observers by using the [`addObserver()`](https://layrjs.com/docs/v1/reference/observable#add-observer-dual-method) method, and trigger their execution anytime by using the [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method) method.

For example, let's define a `Movie` class using the `Observable()` mixin:

```
// JS

import {Observable} from '@layr/observable';

class Movie extends Observable(Object) {
  get title() {
    return this._title;
  }

  set title(title) {
    this._title = title;
    this.callObservers();
  }
}
```

```
// TS

import {Observable} from '@layr/observable';

class Movie extends Observable(Object) {
  _title?: string;

  get title() {
    return this._title;
  }

  set title(title: string) {
    this._title = title;
    this.callObservers();
  }
}
```

Next, we can create a `Movie` instance, and observe it:

```
const movie = new Movie();

movie.addObserver(() => {
  console.log('The movie's title has changed');
})
```

And now, every time we change the title of `movie`, its observer will be automatically executed:

```
movie.title = 'Inception';

// Should display:
// 'The movie's title has changed'
```

> Note that the same result could have been achieved by using a Layr [`Component`](https://layrjs.com/docs/v1/reference/component):
>
> ```
> // JS
>
> import {Component, attribute} from '@layr/component';
>
> class Movie extends Component {
>   @attribute('string?') title;
> }
> ```
>
> ```
> // TS
>
> import {Component, attribute} from '@layr/component';
>
> class Movie extends Component {
>   @attribute('string?') title?: string;
> }
> ```

### Observable <badge type="primary">class</badge> {#observable-class}

An `Observable` class is constructed by calling the `Observable()` mixin ([see above](https://layrjs.com/docs/v1/reference/observable#observable-mixin)).

#### Methods

##### `addObserver(observer)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#add-observer-dual-method}

Adds an observer to the current class or instance.

**Parameters:**

* `observer`: A function that will be automatically executed when the [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method) method is called. Alternatively, you can specify an observable for which the observers should be executed, and doing so, you can connect an observable to another observable.

**Example:**

```
Movie.addObserver(() => {
  // A `Movie` class observer
});

const movie = new Movie();

movie.addObserver(() => {
  // A `Movie` instance observer
});

const actor = new Actor();

// Connect `actor` to `movie` so that when `callObservers()` is called on `actor`,
// then `callObservers()` is automatically called on `movie`
actor.addObserver(movie);
```

##### `removeObserver(observer)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#remove-observer-dual-method}

Removes an observer from the current class or instance.

**Parameters:**

* `observer`: A function or a connected observable.

**Example:**

```
const observer = () => {
  // ...
}

// Add `observer` to the `Movie` class
Movie.addObserver(observer);

// Remove `observer` from to the `Movie` class
Movie.removeObserver(observer);

const movie = new Movie();
const actor = new Actor();

// Connect `actor` to `movie`
actor.addObserver(movie);

// Remove the connection between `actor` and `movie`
actor.removeObserver(movie);
```

##### `callObservers([payload])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#call-observers-dual-method}

Calls the observers of the current class or instance.

**Parameters:**

* `payload`: An optional object to pass to the observers when they are executed.

**Example:**

```
const movie = new Movie();

movie.addObserver((payload) => {
  console.log('Observer called with:', payload);
});

movie.callObservers();

// Should display:
// 'Observer called with: undefined'

movie.callObservers({changes: ['title']});

// Should display:
// 'Observer called with: {changes: ['title']}'
```

#### Bringing Observability to an Object or an Array

##### `createObservable(target)` <badge type="tertiary-outline">function</badge> {#create-observable-function}

Returns an observable from an existing object or array.

The returned observable is observed deeply. So, for example, if an object contains a nested object, modifying the nested object will trigger the execution of the parent's observers.

The returned observable provides the same methods as an [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) instance:

- [`addObserver()`](https://layrjs.com/docs/v1/reference/observable#add-observer-dual-method)
- [`removeObserver()`](https://layrjs.com/docs/v1/reference/observable#remove-observer-dual-method)
- [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method)

**Parameters:**

* `target`: A JavaScript plain object or array that you want to observe.

**Returns:**

An observable objet or array.

**Example:**

```
import {createObservable} from '@layr/observable';

// Create an observable `movie`
const movie = createObservable({
  title: 'Inception',
  genres: ['drama'],
  details: {duration: 120}
});

// Add an observer
movie.addObserver(() => {
  // ...
});

// Then, any of the following changes on `movie` will call the observer:
movie.title = 'Inception 2';
delete movie.title;
movie.year = 2010;
movie.genres.push('action');
movie.genres[1] = 'sci-fi';
movie.details.duration = 125;
```

#### Utilities

##### `isObservable(value)` <badge type="tertiary-outline">function</badge> {#is-observable-function}

Returns whether the specified value is observable. When a value is observable, you can use any the following methods on it: [`addObserver()`](https://layrjs.com/docs/v1/reference/observable#add-observer-dual-method), [`removeObserver()`](https://layrjs.com/docs/v1/reference/observable#remove-observer-dual-method), and [`callObservers()`](https://layrjs.com/docs/v1/reference/observable#call-observers-dual-method).

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
