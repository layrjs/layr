### Navigator <badge type="primary">class</badge> {#navigator-class}

*Inherits from [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class).*

An abstract class from which classes such as [`BrowserNavigator`](https://layrjs.com/docs/v1/reference/browser-navigator) or [`MemoryNavigator`](https://layrjs.com/docs/v1/reference/memory-navigator) are constructed. Unless you build a custom navigator, you probably won't have to use this class directly.

#### Current Location

##### `getCurrentURL()` <badge type="secondary-outline">instance method</badge> {#get-current-url-instance-method}

Returns the current URL of the navigator.

**Returns:**

A string.

**Example:**

```
// See the definition of `navigator` in the `findRouteByURL()` example

navigator.navigate('/movies/inception?showDetails=1#actors');
navigator.getCurrentURL(); // => /movies/inception?showDetails=1#actors'
```

##### `getCurrentPath()` <badge type="secondary-outline">instance method</badge> {#get-current-path-instance-method}

Returns the path of the current URL.

**Returns:**

A string.

**Example:**

```
// See the definition of `navigator` in the `findRouteByURL()` example

navigator.navigate('/movies/inception?showDetails=1#actors');
navigator.getCurrentPath(); // => '/movies/inception'
```

##### `getCurrentQuery()` <badge type="secondary-outline">instance method</badge> {#get-current-query-instance-method}

Returns an object representing the query of the current URL.

The [`qs`](https://github.com/ljharb/qs) package is used under the hood to parse the query.

**Returns:**

A plain object.

**Example:**

```
// See the definition of `navigator` in the `findRouteByURL()` example

navigator.navigate('/movies/inception?showDetails=1#actors');
navigator.getCurrentQuery(); // => {showDetails: '1'}
```

##### `getCurrentHash()` <badge type="secondary-outline">instance method</badge> {#get-current-hash-instance-method}

Returns the hash (i.e., the [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) contained in the current URL. If the current URL doesn't contain a hash, returns `undefined`.

**Returns:**

A string or `undefined`.

**Example:**

```
// See the definition of `navigator` in the `findRouteByURL()` example

navigator.navigate('/movies/inception?showDetails=1#actors');
navigator.getCurrentHash(); // => 'actors'

navigator.navigate('/movies/inception?showDetails=1#actors');
navigator.getCurrentHash(); // => 'actors'

navigator.navigate('/movies/inception?showDetails=1#');
navigator.getCurrentHash(); // => undefined

navigator.navigate('/movies/inception?showDetails=1');
navigator.getCurrentHash(); // => undefined
```

#### Navigation

##### `navigate(url, [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#navigate-instance-method}

Navigates to a URL.

The specified URL is added to the navigator's history.

The observers of the navigator are automatically called.

Note that instead of using this method, you can use the handy `navigate()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
* `options`:
  * `silent`: A boolean specifying whether the navigator's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the navigator's observers should be deferred to the next tick (default: `true`).

**Example:**

```
navigator.navigate('/movies/inception');

// Same as above, but in a more idiomatic way:
Movie.Viewer.navigate({slug: 'inception});
```

##### `redirect(url, [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#redirect-instance-method}

Redirects to a URL.

The specified URL replaces the current entry of the navigator's history.

The observers of the navigator are automatically called.

Note that instead of using this method, you can use the handy `redirect()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
* `options`:
  * `silent`: A boolean specifying whether the navigator's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the navigator's observers should be deferred to the next tick (default: `true`).

**Example:**

```
navigator.redirect('/sign-in');

// Same as above, but in a more idiomatic way:
Session.SignIn.redirect();
```

##### `reload(url)` <badge type="secondary-outline">instance method</badge> {#reload-instance-method}

Reloads the execution environment with the specified URL.

Note that instead of using this method, you can use the handy `reload()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Example:**

```
navigator.reload('/');

// Same as above, but in a more idiomatic way:
Frontend.Home.reload();
```

##### `go(delta, [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#go-instance-method}

Move forwards or backwards through the navigator's history.

The observers of the navigator are automatically called.

**Parameters:**

* `delta`: A number representing the position in the navigator's history to which you want to move, relative to the current entry. A negative value moves backwards, a positive value moves forwards.
* `options`:
  * `silent`: A boolean specifying whether the navigator's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the navigator's observers should be deferred to the next tick (default: `true`).

**Example:**

```
navigator.go(-2); // Move backwards by two entries of the navigator's history

navigator.go(-1); // Equivalent of calling `navigator.goBack()`

navigator.go(1); // Equivalent of calling `navigator.goForward()`

navigator.go(2); // Move forward two entries of the navigator's history
```

##### `goBack([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#go-back-instance-method}

Go back to the previous entry in the navigator's history.

This method is the equivalent of calling `navigator.go(-1)`.

The observers of the navigator are automatically called.

**Parameters:**

* `options`:
  * `silent`: A boolean specifying whether the navigator's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the navigator's observers should be deferred to the next tick (default: `true`).

##### `goForward([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#go-forward-instance-method}

Go forward to the next entry in the navigator's history.

This method is the equivalent of calling `navigator.go(1)`.

The observers of the navigator are automatically called.

**Parameters:**

* `options`:
  * `silent`: A boolean specifying whether the navigator's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the navigator's observers should be deferred to the next tick (default: `true`).

##### `getHistoryLength()` <badge type="secondary-outline">instance method</badge> {#get-history-length-instance-method}

Returns the number of entries in the navigator's history.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.

#### Utilities

##### `isNavigatorClass(value)` <badge type="tertiary-outline">function</badge> {#is-navigator-class-function}

Returns whether the specified value is a navigator class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isNavigatorInstance(value)` <badge type="tertiary-outline">function</badge> {#is-navigator-instance-function}

Returns whether the specified value is a navigator instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
