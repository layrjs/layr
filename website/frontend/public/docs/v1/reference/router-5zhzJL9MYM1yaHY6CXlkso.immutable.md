### Router <badge type="primary">class</badge> {#router-class}

*Inherits from [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class).*

An abstract class from which classes such as [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) or [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router) are constructed. Unless you build a custom router, you probably won't have to use this class directly.

#### Component Registration

##### `registerRootComponent(rootComponent)` <badge type="secondary-outline">instance method</badge> {#register-root-component-instance-method}

Registers all the [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that are provided (directly or recursively) by the specified root component.

**Parameters:**

* `rootComponent`: A [`Component`](https://layrjs.com/docs/v1/reference/component) class.

**Example:**

```
import {Component} from '@layr/component';
import {Routable} from '@layr/routable';
import {BrowserRouter} from '@layr/browser-router';

class User extends Routable(Component) {
  // ...
}

class Movie extends Routable(Component) {
  // ...
}

class Frontend extends Component {
  @provide() static User = User;
  @provide() static Movie = Movie;
}

const router = new BrowserRouter();

router.registerRootComponent(Frontend); // User and Movie will be registered
```

##### `getRootComponents()` <badge type="secondary-outline">instance method</badge> {#get-root-components-instance-method}

Gets all the root components that are registered into the router.

**Returns:**

An iterator of [`Component`](https://layrjs.com/docs/v1/reference/component) classes.

##### `getRoutable(name)` <badge type="secondary-outline">instance method</badge> {#get-routable-instance-method}

Gets a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that is registered into the router. An error is thrown if there is no routable component with the specified name.

**Parameters:**

* `name`: The name of the routable component to get.

**Returns:**

A [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) class.

**Example:**

```
// See the definition of `router` in the `registerRootComponent()` example

router.getRoutable('Movie'); // => Movie class
router.getRoutable('User'); // => User class
router.getRoutable('Film'); // => Error
```

##### `hasRoutable(name)` <badge type="secondary-outline">instance method</badge> {#has-routable-instance-method}

Returns whether a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) is registered into the router.

**Parameters:**

* `name`: The name of the routable component to check.

**Returns:**

A boolean.

**Example:**

```
// See the definition of `router` in the `registerRootComponent()` example

router.hasRoutable('Movie'); // => true
router.hasRoutable('User'); // => true
router.hasRoutable('Film'); // => false
```

##### `registerRoutable(routable)` <badge type="secondary-outline">instance method</badge> {#register-routable-instance-method}

Registers a specific [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) into the router. Typically, instead of using this method, you would rather use the [`registerRootComponent()`](https://layrjs.com/docs/v1/reference/router#register-root-component-instance-method) method to register multiple routable components at once.

**Parameters:**

* `routable`: The [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) class to register.

**Example:**

```
class Movie extends Routable(Component) {
  // ...
}

const router = new BrowserRouter();

router.registerRoutable(Movie);
```

##### `getRoutables()` <badge type="secondary-outline">instance method</badge> {#get-routables-instance-method}

Gets all the [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that are registered into the router.

**Returns:**

An iterator of [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) classes.

#### Routes

##### `findRouteByURL(url)` <badge type="secondary-outline">instance method</badge> {#find-route-by-url-instance-method}

Finds the first route that matches the specified URL.

If no route matches the specified URL, returns `undefined`.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

An object of the shape `{routable, route, params}` (or `undefined` if no route was found) where `routable` is the [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) containing the route that was found, `route` is the [route](https://layrjs.com/docs/v1/reference/route) that was found, and `params` is a plain object representing the parameters that are included in the specified URL.

**Example:**

```
class Movie extends Routable(Component) {
  // ...

  @route('/movies/:slug') @view() static Viewer() {
    // ...
  }
}

const router = new BrowserRouter();
router.registerRoutable(Movie);

const {routable, route, params} = router.findRouteByURL('/movies/inception');

routable; // => Movie class
route; // => Viewer() route
params; // => {slug: 'inception'}
```

##### `getParamsFromURL(url)` <badge type="secondary-outline">instance method</badge> {#get-params-from-url-instance-method}

Returns the parameters that are included in the specified URL.

If no route matches the specified URL, throws an error.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

A plain object representing the parameters that are included in the specified URL.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.getParamsFromURL('/movies/inception'); // => {slug: 'inception'}
```

##### `callRouteByURL(url, [options])` <badge type="secondary-outline">instance method</badge> {#call-route-by-url-instance-method}

Calls the method associated to the first route that matches the specified URL.

If no route matches the specified URL, calls the specified fallback or throws an error if no fallback is specified.

When a route is found, the associated method is called with the parameters that are included in the specified URL.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
* `options`:
  * `fallback`: A function to call in case no route matches the specified URL (default: `undefined`).

**Returns:**

The result of the method associated to the route that was found or the result of the specified fallback if no route was found.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.callRouteByURL('/movies/inception'); // => Some React elements

// `Movie.Viewer()` was called as follows:
// Movie.Viewer({slug: 'inception'});
```

#### Current Location

##### `getCurrentURL()` <badge type="secondary-outline">instance method</badge> {#get-current-url-instance-method}

Returns the current URL of the router.

**Returns:**

A string.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.navigate('/movies/inception?showDetails=1#actors');
router.getCurrentURL(); // => /movies/inception?showDetails=1#actors'
```

##### `getCurrentParams()` <badge type="secondary-outline">instance method</badge> {#get-current-params-instance-method}

Returns the parameters that are included in the current URL of the router.

**Returns:**

A plain object.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.navigate('/movies/inception?showDetails=1#actors');
router.getCurrentParams(); // => {slug: 'inception'}
```

##### `getCurrentPath()` <badge type="secondary-outline">instance method</badge> {#get-current-path-instance-method}

Returns the path of the current URL.

**Returns:**

A string.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.navigate('/movies/inception?showDetails=1#actors');
router.getCurrentPath(); // => '/movies/inception'
```

##### `getCurrentQuery()` <badge type="secondary-outline">instance method</badge> {#get-current-query-instance-method}

Returns an object representing the query of the current URL.

The [`qs`](https://github.com/ljharb/qs) package is used under the hood to parse the query.

**Returns:**

A plain object.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.navigate('/movies/inception?showDetails=1#actors');
router.getCurrentQuery(); // => {showDetails: '1'}
```

##### `getCurrentHash()` <badge type="secondary-outline">instance method</badge> {#get-current-hash-instance-method}

Returns the hash (i.e., the [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) contained in the current URL. If the current URL doesn't contain a hash, returns `undefined`.

**Returns:**

A string or `undefined`.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.navigate('/movies/inception?showDetails=1#actors');
router.getCurrentHash(); // => 'actors'

router.navigate('/movies/inception?showDetails=1#actors');
router.getCurrentHash(); // => 'actors'

router.navigate('/movies/inception?showDetails=1#');
router.getCurrentHash(); // => undefined

router.navigate('/movies/inception?showDetails=1');
router.getCurrentHash(); // => undefined
```

##### `callCurrentRoute([options])` <badge type="secondary-outline">instance method</badge> {#call-current-route-instance-method}

Calls the method associated to the first route that matches the current URL.

If no route matches the current URL, calls the specified fallback or throws an error if no fallback is specified.

When a route is found, the associated method is called with the parameters that are included in the current URL.

**Parameters:**

* `options`:
  * `fallback`: A function to call in case no route matches the current URL (default: `undefined`).

**Returns:**

The result of the method associated to the route that was found or the result of the specified fallback if no route was found.

**Example:**

```
// See the definition of `router` in the `findRouteByURL()` example

router.navigate('/movies/inception');
router.callCurrentRoute(); // => Some React elements

// `Movie.Viewer()` was called as follows:
// Movie.Viewer({slug: 'inception'});
```

#### Navigation

##### `navigate(url, [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#navigate-instance-method}

Navigates to a URL.

The specified URL is added to the router's history.

The observers of the router are automatically called.

Note that instead of using this method, you can use the handy `navigate()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
* `options`:
  * `silent`: A boolean specifying whether the router's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).

**Example:**

```
router.navigate('/movies/inception');

// Same as above, but in a more idiomatic way:
Movie.Viewer.navigate({slug: 'inception});
```

##### `redirect(url, [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#redirect-instance-method}

Redirects to a URL.

The specified URL replaces the current entry of the router's history.

The observers of the router are automatically called.

Note that instead of using this method, you can use the handy `redirect()` shortcut function that you get when you define a route with the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.
* `options`:
  * `silent`: A boolean specifying whether the router's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).

**Example:**

```
router.redirect('/sign-in');

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
router.reload('/');

// Same as above, but in a more idiomatic way:
Frontend.Home.reload();
```

##### `go(delta, [options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#go-instance-method}

Move forwards or backwards through the router's history.

The observers of the router are automatically called.

**Parameters:**

* `delta`: A number representing the position in the router's history to which you want to move, relative to the current entry. A negative value moves backwards, a positive value moves forwards.
* `options`:
  * `silent`: A boolean specifying whether the router's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).

**Example:**

```
router.go(-2); // Move backwards by two entries of the router's history

router.go(-1); // Equivalent of calling `router.goBack()`

router.go(1); // Equivalent of calling `router.goForward()`

router.go(2); // Move forward two entries of the router's history
```

##### `goBack([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#go-back-instance-method}

Go back to the previous entry in the router's history.

This method is the equivalent of calling `router.go(-1)`.

The observers of the router are automatically called.

**Parameters:**

* `options`:
  * `silent`: A boolean specifying whether the router's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).

##### `goForward([options])` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#go-forward-instance-method}

Go forward to the next entry in the router's history.

This method is the equivalent of calling `router.go(1)`.

The observers of the router are automatically called.

**Parameters:**

* `options`:
  * `silent`: A boolean specifying whether the router's observers should *not* be called (default: `false`).
  * `defer`: A boolean specifying whether the calling of the router's observers should be deferred to the next tick (default: `false`).

##### `getHistoryLength()` <badge type="secondary-outline">instance method</badge> {#get-history-length-instance-method}

Returns the number of entries in the router's history.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.

#### Utilities

##### `isRouterClass(value)` <badge type="tertiary-outline">function</badge> {#is-router-class-function}

Returns whether the specified value is a router class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isRouterInstance(value)` <badge type="tertiary-outline">function</badge> {#is-router-instance-function}

Returns whether the specified value is a router instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
