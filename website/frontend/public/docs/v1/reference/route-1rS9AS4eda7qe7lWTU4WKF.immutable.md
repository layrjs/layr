### Route <badge type="primary">class</badge> {#route-class}

Represents a route in a [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class).

A route is composed of:

- A name matching a class method of the [routable component](https://layrjs.com/docs/v1/reference/routable#routable-component-class) that contains the route.
- The canonical [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) of the route.
- Some [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) aliases.

#### Usage

Typically, you create a `Route` and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

See an example of use in the [`Routable()`](https://layrjs.com/docs/v1/reference/routable#usage) mixin.

#### Creation

##### `new Route(name, pattern, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Route`](https://layrjs.com/docs/v1/reference/route). Typically, instead of using this constructor, you would rather use the [`@route()`](https://layrjs.com/docs/v1/reference/routable#route-decorator) decorator.

**Parameters:**

* `name`: The name of the route.
* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) of the route.
* `options`:
  * `aliases`: An array of alternate [URL patterns](https://layrjs.com/docs/v1/reference/route#url-pattern-type).

**Returns:**

The [`Route`](https://layrjs.com/docs/v1/reference/route) instance that was created.

**Example:**

```
const route = new Route('Home', '/', {aliases: ['/home']});
```

#### Basic Methods

##### `getName()` <badge type="secondary-outline">instance method</badge> {#get-name-instance-method}

Returns the name of the route.

**Returns:**

A string.

**Example:**

```
const route = new Route('Home', '/');

route.getName(); // => 'Home'
```

##### `getPattern()` <badge type="secondary-outline">instance method</badge> {#get-pattern-instance-method}

Returns the canonical URL pattern of the route.

**Returns:**

An [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) string.

**Example:**

```
const route = new Route('Viewer', '/movies/:slug\\?:showDetails');

route.getPattern(); // => '/movies/:slug\\?:showDetails'
```

##### `getAliases()` <badge type="secondary-outline">instance method</badge> {#get-aliases-instance-method}

Returns the alternate URL patterns of the route.

**Returns:**

An array of [URL pattern](https://layrjs.com/docs/v1/reference/route#url-pattern-type) strings.

**Example:**

```
const route = new Route('Home', '/', {aliases: ['/home']});

route.getAliases(); // => ['/home']
```

#### URL Matching and Generation

##### `matchURL(url)` <badge type="secondary-outline">instance method</badge> {#match-url-instance-method}

Checks if the route matches the specified URL.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

If the route matches the specified URL, a plain object representing the parameters that are included in the URL (or an empty object if there is no parameters) is returned. Otherwise, `undefined` is returned.

**Example:**

```
const route = new Route('Viewer', '/movies/:slug\\?:showDetails');

route.matchURL('/movies/abc123'); // => {slug: 'abc123'}

route.matchURL('/movies/abc123?showDetails=1'); // => {slug: 'abc123', showDetails: '1'}

route.matchURL('/films'); // => undefined
```

##### `generateURL([params], [options])` <badge type="secondary-outline">instance method</badge> {#generate-url-instance-method}

Generates an URL for the route.

**Parameters:**

* `params`: An optional object representing the parameters to include in the generated URL.
* `options`:
  * `hash`: A string representing an hash (i.e., a [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) to include in the generated URL.

**Returns:**

A string.

**Example:**

```
const route = new Route('Viewer', '/movies/:slug\\?:showDetails');

route.generateURL({slug: 'abc123'}); // => '/movies/abc123'

route.generateURL({slug: 'abc123', showDetails: '1'}); // => '/movies/abc123?showDetails=1'

route.generateURL({}); // => Error (the slug parameter is mandatory)
```

#### Types

##### `URLPattern` <badge type="primary-outline">type</badge> {#url-pattern-type}

A string representing the canonical URL pattern (or an alternate URL pattern) of a route.

An URL pattern is composed of a *path pattern* and an optional *query pattern* that are separated by an escaped question mark (`\\?`).

A *path pattern* represents the path part of an URL and it can include some parameters by prefixing the name of each parameter with a colon sign (`:`). The [`path-to-regexp`](https://github.com/pillarjs/path-to-regexp) package is used under the hood to handle the path patterns, so any path pattern that is supported by `path-to-regexp` is supported by Layr as well.

A *query pattern* represents the query part of an URL and it is composed of a list of parameters separated by an ampersand sign (`&`). Just like a path parameter, a query parameter is represented by a name prefixed with a colon sign (`:`). When an URL is matched against an URL pattern with the [`matchURL()`](https://layrjs.com/docs/v1/reference/route#match-url-instance-method) method, the [`qs`](https://github.com/ljharb/qs) package is used under the hood to parse the query part of the URL.

**Examples:**

- `'/'`: Root URL pattern.
- `'/movies'`: URL pattern without parameters.
- `'/movies/:id'`: URL pattern with one path parameter (`id`).
- `'/movies/:movieId/actors/:actorId'`: URL pattern with two path parameter (`movieId` and `actorId`).
- `'/movies\\?:sortBy'`: URL pattern with one query parameter (`sortBy`).
- `'/movies\\?:sortBy&:offset'`: URL pattern with two query parameters (`sortBy` and `offset`).
- `'/movies/:id\\?:showDetails'`: URL pattern with one path parameter (`id`) and one query parameter (`showDetails`).
- `'/movies/:genre?'`: URL pattern with an [optional](https://github.com/pillarjs/path-to-regexp#optional) path parameter (`genre`).
- `'/:slugs*'`: URL pattern with [zero or more](https://github.com/pillarjs/path-to-regexp#zero-or-more) path parameters (`slugs`).
- `'/:slugs+'`: URL pattern with [one or more](https://github.com/pillarjs/path-to-regexp#one-or-more) path parameters (`slugs`).
- `'/movies/:id(\\d+)'`: URL pattern with one path parameter (`id`) restricted to digits.

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
