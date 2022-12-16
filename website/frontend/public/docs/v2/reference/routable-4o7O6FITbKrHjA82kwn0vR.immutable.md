### Routable() <badge type="primary">mixin</badge> {#routable-mixin}

Extends a [`Component`](https://layrjs.com/docs/v2/reference/component) class with some routing capabilities.

#### Usage

Call `Routable()` with a [`Component`](https://layrjs.com/docs/v2/reference/component) class to construct a [`RoutableComponent`](https://layrjs.com/docs/v2/reference/routable#routable-component-class) class.

Then, you can define some routes or wrappers into this class by using the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) or [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorators.

See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.

### RoutableComponent <badge type="primary">class</badge> {#routable-component-class}

*Inherits from [`Component`](https://layrjs.com/docs/v2/reference/component).*

A `RoutableComponent` class is constructed by calling the `Routable()` mixin ([see above](https://layrjs.com/docs/v2/reference/routable#routable-mixin)).

#### Component Methods

See the methods that are inherited from the [`Component`](https://layrjs.com/docs/v2/reference/component#creation) class.

#### Navigator

##### `getNavigator()` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-navigator-dual-method}

Returns the navigator in which the routable component is registered. If the routable component is not registered in a navigator, an error is thrown.

**Returns:**

A [`Navigator`](https://layrjs.com/docs/v2/reference/navigator) instance.

**Example:**

```
Article.getNavigator(); // => navigator instance
```

#### Routes

##### `getRoute(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-route-dual-method}

Gets a route. If there is no route with the specified name, an error is thrown.

**Parameters:**

* `name`: The name of the route to get.

**Returns:**

A [Route](https://layrjs.com/docs/v2/reference/route) instance.

**Example:**

```
Article.getRoute('View'); // A route instance
```

##### `hasRoute(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-route-dual-method}

Returns whether the routable component has a route with the specified name.

**Parameters:**

* `name`: The name of the route to check.

**Returns:**

A boolean.

**Example:**

```
Article.hasRoute('View'); // => true
```

##### `setRoute(name, pattern, [options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-route-dual-method}

Sets a route for a routable component class or instances.

Typically, instead of using this method, you would rather use the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) decorator.

**Parameters:**

* `name`: The name of the route.
* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
* `options`: An optional object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the route is created.

**Returns:**

The [Route](https://layrjs.com/docs/v2/reference/route) instance that was created.

**Example:**

```
Article.setRoute('View', '/articles', {parameters: {page: 'number?'});

Article.prototype.setRoute('View', '/articles/:id', {parameters: {showDetails: 'boolean?'}});
```

##### `findRouteByURL(url)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#find-route-by-url-dual-method}

Finds the first route that matches the specified URL.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

When a route is found, returns an object of the shape `{route, identifiers, params}` where `route` is the [route](https://layrjs.com/docs/v2/reference/route) that was found, `identifiers` is a plain object containing the value of some [component identifier attributes](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type), and `params` is a plain object containing the value of some [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type). If no routes were found, returns `undefined`.

**Example:**

```
const result = Article.prototype.findRouteByURL('/articles/abc123?showDetails=1');

result.route; // => A route instance
result.identifiers; // => {id: 'abc123'}
result.params; // => {showDetails: true}
```

#### Wrappers

##### `getWrapper(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-wrapper-dual-method}

Gets a wrapper. If there is no wrapper with the specified name, an error is thrown.

**Parameters:**

* `name`: The name of the wrapper to get.

**Returns:**

A [Wrapper](https://layrjs.com/docs/v2/reference/wrapper) instance.

**Example:**

```
Article.getWrapper('Layout'); => A wrapper instance
```

##### `hasWrapper(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-wrapper-dual-method}

Returns whether the routable component has a wrapper with the specified name.

**Parameters:**

* `name`: The name of the wrapper to check.

**Returns:**

A boolean.

**Example:**

```
Article.hasWrapper('Layout'); // => true
```

##### `setWrapper(name, pattern, [options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-wrapper-dual-method}

Sets a wrapper for a routable component class or instances.

Typically, instead of using this method, you would rather use the [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorator.

**Parameters:**

* `name`: The name of the wrapper.
* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
* `options`: An optional object specifying the options to pass to the `Wrapper`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the wrapper is created.

**Returns:**

The [Wrapper](https://layrjs.com/docs/v2/reference/wrapper) instance that was created.

**Example:**

```
Article.setWrapper('Layout', '/articles');

Article.prototype.setWrapper('View', '[/articles]/:id');
```

##### `findWrapperByPath(path)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#find-wrapper-by-path-dual-method}

Finds the first wrapper that matches the specified path.

**Parameters:**

* `path`: A string representing a path.

**Returns:**

When a wrapper is found, returns an object of the shape `{wrapper, identifiers}` where `wrapper` is the [wrapper](https://layrjs.com/docs/v2/reference/wrapper) that was found and `identifiers` is a plain object containing the value of some [component identifier attributes](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type). If no wrappers were found, returns `undefined`.

**Example:**

```
const result = Article.prototype.findWrapperByPath('/articles/abc123');

result.wrapper; // => A wrapper instance
result.identifiers; // => {id: 'abc123'}
```

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v2/reference/observable#observable-class) class.

#### Decorators

##### `@route(pattern, [options])` <badge type="tertiary">decorator</badge> {#route-decorator}

Defines a [route](https://layrjs.com/docs/v2/reference/route) for a static or instance method in a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).

**Parameters:**

* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the route.
* `options`: An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the route is created.

**Shortcut functions:**

In addition to defining a route, the decorator adds some shortcut functions to the decorated method so that you can interact with the route more easily.

For example, if you define a `route` for a `View()` method you automatically get the following functions:

- `View.matchURL(url)` is the equivalent of [`route.matchURL(url)`](https://layrjs.com/docs/v2/reference/addressable#match-url-instance-method).
- `View.generateURL([params], [options])` is the equivalent of [`route.generateURL(component, [params], [options])`](https://layrjs.com/docs/v2/reference/addressable#generate-url-instance-method) where `component` is the [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class) associated with the `View()` method.

If the defined `route` is controlled by a [`navigator`](https://layrjs.com/docs/v2/reference/navigator), you also get the following shortcut functions:

- `View.navigate([params], [options])` is the equivalent of [`navigator.navigate(url, options)`](https://layrjs.com/docs/v2/reference/navigator#navigate-instance-method) where `url` is generated by calling `View.generateURL([params], [options])`.
- `View.redirect([params], [options])` is the equivalent of [`navigator.redirect(url, options)`](https://layrjs.com/docs/v2/reference/navigator#redirect-instance-method) where `url` is generated by calling `View.generateURL([params], [options])`.
- `View.reload([params], [options])` is the equivalent of [`navigator.reload(url)`](https://layrjs.com/docs/v2/reference/navigator#reload-instance-method) where `url` is generated by calling `View.generateURL([params], [options])`.
- `View.isActive()` returns a boolean indicating whether the `route`'s URL (generated by calling `View.generateURL()`) matches the current `navigator`'s URL.

Lastly, if the defined `route` is controlled by a [`navigator`](https://layrjs.com/docs/v2/reference/navigator) that is created by using the [`useBrowserNavigator()`](https://layrjs.com/docs/v2/reference/react-integration#use-browser-navigator-react-hook) React hook, you also get the following shortcut React component:

- `View.Link({params, hash, ...props})` is the equivalent of [`navigator.Link({to, ...props})`](https://layrjs.com/docs/v2/reference/browser-navigator#link-instance-method) where `to` is generated by calling `View.generateURL(params, {hash})`.

**Example:**

See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
##### `@wrapper(pattern, [options])` <badge type="tertiary">decorator</badge> {#wrapper-decorator}

Defines a [wrapper](https://layrjs.com/docs/v2/reference/wrapper) for a static or instance method in a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).

**Parameters:**

* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the wrapper.
* `options`: An object specifying the options to pass to the `Wrapper`'s [constructor](https://layrjs.com/docs/v2/reference/addressable#constructor) when the wrapper is created.

**Example:**

See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v2/reference/browser-navigator) class.
#### Utilities

##### `isRoutableClass(value)` <badge type="tertiary-outline">function</badge> {#is-routable-class-function}

Returns whether the specified value is a routable component class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isRoutableInstance(value)` <badge type="tertiary-outline">function</badge> {#is-routable-instance-function}

Returns whether the specified value is a routable component class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isRoutableClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#is-routable-class-or-instance-function}

Returns whether the specified value is a routable component class or instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `assertIsRoutableClass(value)` <badge type="tertiary-outline">function</badge> {#assert-is-routable-class-function}

Throws an error if the specified value is not a routable component class.

**Parameters:**

* `value`: A value of any type.

##### `assertIsRoutableInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-routable-instance-function}

Throws an error if the specified value is not a routable component instance.

**Parameters:**

* `value`: A value of any type.

##### `assertIsRoutableClassOrInstance(value)` <badge type="tertiary-outline">function</badge> {#assert-is-routable-class-or-instance-function}

Throws an error if the specified value is not a routable component class or instance.

**Parameters:**

* `value`: A value of any type.
