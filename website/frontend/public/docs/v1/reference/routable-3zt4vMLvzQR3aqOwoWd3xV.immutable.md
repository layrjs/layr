### Routable() <badge type="primary">mixin</badge> {#routable-mixin}

Extends a [`Component`](https://layrjs.com/docs/v1/reference/component) class with some routing capabilities.

#### Usage

Call `Routable()` with a [`Component`](https://layrjs.com/docs/v1/reference/component) class to construct a [`RoutableComponent`](https://layrjs.com/docs/v1/reference/routable#routable-component-class) class. Then, you can define some routes into this class by using the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Example:**

```
// JS

import {Component} from '@layr/component';
import {Routable, route} from '@layr/routable';

class Article extends Routable(Component) {
  @route('/articles/:id/upvote') static upvote({id}) {
    // ...
  }
}
```

```
// TS

import {Component} from '@layr/component';
import {Routable, route} from '@layr/routable';

class Article extends Routable(Component) {
  @route('/articles/:id/upvote') static upvote({id}: {id: string}) {
    // ...
  }
}
```

Once you have a routable component, you can use any method provided by the `Routable()` mixin.

For example, to call the `upvote()` method by a URL, you can use the [`callRouteByURL()`](https://layrjs.com/docs/v1/reference/routable#call-route-by-url-class-method) method:

```
await Article.callRouteByURL('/articles/abc123/upvote');

// Which is the equivalent of calling the `upvote()` method directly:
await Article.upvote({id: 'abc123'});
```

A routable component can be registered into a router such as [BrowserRouter](https://layrjs.com/docs/v1/reference/browser-router) by using the [`registerRoutable()`](https://layrjs.com/docs/v1/reference/router#register-routable-instance-method) method (or [`registerRootComponent()`](https://layrjs.com/docs/v1/reference/router#register-root-component-instance-method) to register several components at once):

```
import {BrowserRouter} from '@layr/browser-router';

const router = new BrowserRouter();

router.registerRoutable(Article);
```

Once a routable component is registered into a router you can control it through its router:

```
await router.callRouteByURL('/articles/abc123/upvote');
```

See the ["Bringing Some Routes"](https://layrjs.com/docs/v1/introduction/routing) guide for a comprehensive example using the `Routable()` mixin.

### RoutableComponent <badge type="primary">class</badge> {#routable-component-class}

*Inherits from [`Component`](https://layrjs.com/docs/v1/reference/component).*

A `RoutableComponent` class is constructed by calling the `Routable()` mixin ([see above](https://layrjs.com/docs/v1/reference/routable#routable-mixin)).

#### Component Methods

See the methods that are inherited from the [`Component`](https://layrjs.com/docs/v1/reference/component#creation) class.

#### Router Registration

##### `getRouter()` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-router-dual-method}

Returns the router in which the routable component is registered. If the routable component is not registered in a router, an error is thrown.

**Returns:**

A [`Router`](https://layrjs.com/docs/v1/reference/router) instance.

**Example:**

```
Article.getRouter(); // => router
```

##### `hasRouter()` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-router-dual-method}

Returns whether the routable component is registered in a router.

**Returns:**

A boolean.

**Example:**

```
Article.hasRouter(); // => true
```

#### Routes

##### `getRoute(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#get-route-dual-method}

Gets a route. If there is no route with the specified name, an error is thrown.

**Parameters:**

* `name`: The name of the route to get.

**Returns:**

A [Route](https://layrjs.com/docs/v1/reference/route) instance.

**Example:**

```
Article.getRoute('upvote'); => upvote() route
```

##### `hasRoute(name)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#has-route-dual-method}

Returns whether the routable component has a route with the specified name.

**Parameters:**

* `name`: The name of the route to check.

**Returns:**

A boolean.

**Example:**

```
Article.hasRoute('upvote'); // => true
```

##### `setRoute(name, pattern, [options])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#set-route-dual-method}

Sets a route in the storable component.

Typically, instead of using this method, you would rather use the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `name`: The name of the route.
* `pattern`: A string specifying the [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) associated with the route.
* `options`: An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v1/reference/route#constructor) when the route is created.

**Returns:**

The [Route](https://layrjs.com/docs/v1/reference/route) instance that was created.

**Example:**

```
Article.setRoute('upvote', '/articles/:id/upvote');
```

##### `callRoute(name, [params])` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#call-route-dual-method}

Calls the method associated to a route that has the specified name. If there is no route with the specified name, an error is thrown.

**Parameters:**

* `name`: The name of the route for which the associated method should be called.
* `params`: The parameters to pass when the method is called.

**Returns:**

The result of the called method.

**Example:**

```
await Article.callRoute('upvote', {id: 'abc123'});

// Which is the equivalent of calling the `upvote()` method directly:
await Article.upvote({id: 'abc123'});
```

##### `findRouteByURL(url)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#find-route-by-url-dual-method}

Finds the first route that matches the specified URL.

If no route matches the specified URL, returns `undefined`.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

An object of the shape `{route, params}` (or `undefined` if no route was found) where `route` is the [route](https://layrjs.com/docs/v1/reference/route) that was found, and `params` is a plain object representing the parameters that are included in the specified URL.

**Example:**

```
const {route, params} = Article.findRouteByURL('/articles/abc123/upvote');

route; // => upvote() route
params; // => {id: 'abc123'}
```

##### `callRouteByURL(url)` <badge type="secondary">class method</badge> <badge type="secondary-outline">instance method</badge> {#call-route-by-url-dual-method}

Calls the method associated to the first route that matches the specified URL.

If no route matches the specified URL, an error is thrown.

When a route is found, the associated method is called with the parameters that are included in the specified URL.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

The result of the method associated to the route that was found.

**Example:**

```
await Article.callRouteByURL('/articles/abc123/upvote');

// Which is the equivalent of calling the `upvote()` method directly:
await Article.upvote({id: 'abc123'});
```

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.

#### Decorators

##### `@route(pattern, [options])` <badge type="tertiary">decorator</badge> {#route-decorator}

Defines a [route](https://layrjs.com/docs/v1/reference/route) for a static or instance method in a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class).

**Parameters:**

* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) of the route.
* `options`: An object specifying the options to pass to the `Route`'s [constructor](https://layrjs.com/docs/v1/reference/route#constructor) when the route is created.

**Shortcut functions:**

In addition to defining a route, the decorator adds some shortcut functions to the decorated method so that you can interact with the route more easily.

For example, if you define a `route` for a `Home()` method you automatically get the following functions:

- `Home.matchURL(url)` is the equivalent of [`route.matchURL(url)`](https://layrjs.com/docs/v1/reference/route#match-url-instance-method).
- `Home.generateURL(params, options)` is the equivalent of [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).

If the defined `route` is controlled by a [`router`](https://layrjs.com/docs/v1/reference/router), you also get the following shortcut functions:

- `Home.navigate(params, options)` is the equivalent of [`router.navigate(url, options)`](https://layrjs.com/docs/v1/reference/router#navigate-instance-method) where `url` is generated by calling [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
- `Home.redirect(params, options)` is the equivalent of [`router.redirect(url, options)`](https://layrjs.com/docs/v1/reference/router#redirect-instance-method) where `url` is generated by calling [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
- `Home.reload(params, options)` is the equivalent of [`router.reload(url)`](https://layrjs.com/docs/v1/reference/router#reload-instance-method) where `url` is generated by calling [`route.generateURL(params, options)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).
- `Home.isActive(params)` returns a boolean indicating whether the `route`'s URL (generated by calling [`route.generateURL(params)`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method)) matches the current `router`'s URL.

Lastly, if the defined `route` is controlled by a [`router`](https://layrjs.com/docs/v1/reference/router) that is created by using the [`useBrowserRouter()`](https://layrjs.com/docs/v1/reference/react-integration#use-browser-router-react-hook) React hook, you also get the following shortcut function:

- `Home.Link({params, hash, ...props})` is the equivalent of [`router.Link({to, ...props})`](https://layrjs.com/docs/v1/reference/browser-router#link-instance-method) where `to` is generated by calling [`route.generateURL(params, {hash})`](https://layrjs.com/docs/v1/reference/route#generate-url-instance-method).

**Example:**

See an example of use in the [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) class.
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
