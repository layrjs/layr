### Route <badge type="primary">class</badge> {#route-class}

Represents a route in a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class).

A route is composed of:

- A name matching a method of the [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that contains the route.
- The canonical [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) of the route.
- Some [URL pattern](https://layrjs.com/docs/v1/reference/addressable#url-pattern-type) aliases.

#### Usage

Typically, you create a `Route` and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

See an example of use in the [`Routable()`](https://layrjs.com/docs/v1/reference/routable#usage) mixin.

#### Utilities

##### `isRouteClass(value)` <badge type="tertiary-outline">function</badge> {#is-route-class-function}

Returns whether the specified value is a [`Route`](https://layrjs.com/docs/v1/reference/route) class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isRouteInstance(value)` <badge type="tertiary-outline">function</badge> {#is-route-instance-function}

Returns whether the specified value is a [`Route`](https://layrjs.com/docs/v1/reference/route) instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
