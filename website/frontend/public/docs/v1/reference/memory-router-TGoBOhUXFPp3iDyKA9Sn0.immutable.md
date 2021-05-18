### MemoryRouter <badge type="primary">class</badge> {#memory-router-class}

*Inherits from [`Router`](https://layrjs.com/docs/v1/reference/router).*

A [`Router`](https://layrjs.com/docs/v1/reference/router) that keeps the navigation history in memory. Useful in tests and non-browser environments like [React Native](https://reactnative.dev/).

#### Usage

Create a `MemoryRouter` instance and register some [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) into it.

See an example of use in the [`BrowserRouter`](https://layrjs.com/docs/v1/reference/browser-router) class.

#### Creation

##### `new MemoryRouter([options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router).

**Parameters:**

* `options`:
  * `initialURLs`: An array of URLs to populate the initial navigation history (default: `[]`).
  * `initialIndex`: A number specifying the current entry's index in the navigation history (default: the index of the last entry in the navigation history).

**Returns:**

The [`MemoryRouter`](https://layrjs.com/docs/v1/reference/memory-router) instance that was created.

#### Component Registration

See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#component-registration) class.

#### Routes

See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#routes) class.

#### Current Location

See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#current-location) class.

#### Navigation

See the methods that are inherited from the [`Router`](https://layrjs.com/docs/v1/reference/router#navigation) class.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.
