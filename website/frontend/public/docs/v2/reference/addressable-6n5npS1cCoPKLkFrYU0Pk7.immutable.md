### Addressable <badge type="primary">class</badge> {#addressable-class}

An abstract class from which the classes [`Route`](https://layrjs.com/docs/v2/reference/route) and [`Wrapper`](https://layrjs.com/docs/v2/reference/wrapper) are constructed.

An addressable is composed of:

- A name matching a method of a [routable component](https://layrjs.com/docs/v2/reference/routable#routable-component-class).
- The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the addressable.
- Some optional [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type) associated with the addressable.
- Some optional [URL pattern aliases](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) associated with the addressable.

#### Usage

Typically, you create a `Route` or a `Wrapper` and associate it to a routable component by using the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) or [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorators.

See an example of use in the [`BrowserNavigatorView`](https://layrjs.com/docs/v2/reference/react-integration#browser-navigator-view-react-component) React component.

#### Creation

##### `new Addressable(name, pattern, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates an instance of [`Addressable`](https://layrjs.com/docs/v2/reference/addressable), which can represent a [`Route`](https://layrjs.com/docs/v2/reference/route) or a [`Wrapper`](https://layrjs.com/docs/v2/reference/wrapper).

Typically, instead of using this constructor, you would rather use the [`@route()`](https://layrjs.com/docs/v2/reference/routable#route-decorator) or [`@wrapper()`](https://layrjs.com/docs/v2/reference/routable#wrapper-decorator) decorators.

**Parameters:**

* `name`: The name of the addressable.
* `pattern`: The canonical [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) of the addressable.
* `options`:
  * `parameters`: An optional object containing some [URL parameters](https://layrjs.com/docs/v2/reference/addressable#url-parameters-type).
  * `aliases`: An optional array containing some [URL pattern aliases](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type).

**Returns:**

The [`Addressable`](https://layrjs.com/docs/v2/reference/addressable) instance that was created.

**Example:**

```
const addressable = new Addressable('View', '/', {aliases: ['/home']});
```

#### Basic Methods

##### `getName()` <badge type="secondary-outline">instance method</badge> {#get-name-instance-method}

Returns the name of the addressable.

**Returns:**

A string.

**Example:**

```
const addressable = new Addressable('View', '/');

addressable.getName(); // => 'View'
```

##### `getPattern()` <badge type="secondary-outline">instance method</badge> {#get-pattern-instance-method}

Returns the canonical URL pattern of the addressable.

**Returns:**

An [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) string.

**Example:**

```
const addressable = new Addressable('View', '/movies/:slug', {aliases: ['/films/:slug']});

addressable.getPattern(); // => '/movies/:slug'
```

##### `getAliases()` <badge type="secondary-outline">instance method</badge> {#get-aliases-instance-method}

Returns the URL pattern aliases of the addressable.

**Returns:**

An array of [URL pattern](https://layrjs.com/docs/v2/reference/addressable#url-pattern-type) strings.

**Example:**

```
const addressable = new Addressable('View', '/', {aliases: ['/home']});

addressable.getAliases(); // => ['/home']
```

#### URL Matching and Generation

##### `matchURL(url)` <badge type="secondary-outline">instance method</badge> {#match-url-instance-method}

Checks if the addressable matches the specified URL.

**Parameters:**

* `url`: A string or a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object.

**Returns:**

If the addressable matches the specified URL, a plain object containing the identifiers and parameters included in the URL is returned. Otherwise, `undefined` is returned.

**Example:**

```
const addressable = new Addressable('View', '/movies/:slug', {
 params: {showDetails: 'boolean?'}
});

addressable.matchURL('/movies/abc123');
// => {identifiers: {slug: 'abc123'}, parameters: {showDetails: undefined}}

addressable.matchURL('/movies/abc123?showDetails=1');
// => {identifiers: {slug: 'abc123'}, parameters: {showDetails: true}}

addressable.matchURL('/films'); // => undefined
```

##### `generateURL([identifiers], [params], [options])` <badge type="secondary-outline">instance method</badge> {#generate-url-instance-method}

Generates an URL for the addressable.

**Parameters:**

* `identifiers`: An optional object containing the identifiers to include in the generated URL.
* `params`: An optional object containing the parameters to include in the generated URL.
* `options`:
  * `hash`: An optional string specifying a hash (i.e., a [fragment identifier](https://en.wikipedia.org/wiki/URI_fragment)) to include in the generated URL.

**Returns:**

A string.

**Example:**

```
const addressable = new Addressable('View', '/movies/:slug', {
 params: {showDetails: 'boolean?'}
});

addressable.generateURL({slug: 'abc123'}); // => '/movies/abc123'

addressable.generateURL({slug: 'abc123'}, {showDetails: true});
// => '/movies/abc123?showDetails=1'

addressable.generateURL({slug: 'abc123'}, {showDetails: true}, {hash: 'actors'});
// => '/movies/abc123?showDetails=1#actors'

addressable.generateURL({}); // => Error (the slug parameter is mandatory)
```

#### Types

##### `URLPattern` <badge type="primary-outline">type</badge> {#url-pattern-type}

A string defining the canonical URL pattern (or an URL pattern alias) of an addressable.

An URL pattern is composed of a *route pattern* (e.g., `'/movies'`) and can be prefixed with a *wrapper pattern*, which should be enclosed with square brackets (e.g., `'[/admin]'`).

*Route patterns* and *wrapper patterns* can be composed of several *segments* separated by slashes (e.g., `'/movies/top-50'` or `'[/admin/movies]'`).

A *segment* can be an arbitrary string (e.g., `'movies'`) or the name of a [component identifier attribute](https://layrjs.com/docs/v2/reference/identifier-attribute) (e.g., `'id'`) prefixed with a colon sign (`':'`). Note that a component identifier attribute can reference an identifier attribute of a related component (e.g., `'collection.id'`).

Optionally, an URL pattern can be suffixed with wildcard character (`'*'`) to represent a catch-all URL.

**Examples:**

- `'/'`: Root URL pattern.
- `'/movies'`: URL pattern without identifier attributes.
- `'/movies/:id'`: URL pattern with one identifier attribute (`id`).
- `'/collections/:collection.id/movies/:id'`: URL pattern with two identifier attributes (`collection.id` and `id`).
- `[/]movies`: URL pattern composed of a wrapper pattern (`'[/]'`) and a route pattern (`'movies'`).
- `'[/collections/:collection.id]/movies/:id'`: URL pattern composed of a wrapper pattern (`'[/collections/:collection.id]'`), a route pattern (`'/movies/:id'`), and two identifier attributes (`collection.id` and `id`).
- `'/*'`: URL pattern that can match any URL. It can be helpful to display, for example, a "Not Found" page.

##### `URLParameters` <badge type="primary-outline">type</badge> {#url-parameters-type}

An object defining the URL parameters of an addressable.

The object can contain some pairs of `name` and `type` where `name` should be an arbitrary string representing the name of an URL parameter and `type` should be a string representing its type.

Currently, `type` can be one of the following strings:

- `'boolean'`
- `'number'`
- `'string'`
- `'Date'`

Optionally, `type` can be suffixed with a question mark (`'?'`) to specify an optional URL parameter.

**Examples:**

- `{step: 'number'}
- `{showDetails: 'boolean?'}`
- `{page: 'number?', orderBy: 'string?'}`

#### Utilities

##### `isAddressableClass(value)` <badge type="tertiary-outline">function</badge> {#is-addressable-class-function}

Returns whether the specified value is an [`Addressable`](https://layrjs.com/docs/v2/reference/addressable) class.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.

##### `isAddressableInstance(value)` <badge type="tertiary-outline">function</badge> {#is-addressable-instance-function}

Returns whether the specified value is an [`Addressable`](https://layrjs.com/docs/v2/reference/addressable) instance.

**Parameters:**

* `value`: A value of any type.

**Returns:**

A boolean.
