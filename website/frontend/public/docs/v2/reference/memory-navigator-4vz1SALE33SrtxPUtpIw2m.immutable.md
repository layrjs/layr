### MemoryNavigator <badge type="primary">class</badge> {#memory-navigator-class}

*Inherits from [`Navigator`](https://layrjs.com/docs/v1/reference/navigator).*

A [`Navigator`](https://layrjs.com/docs/v1/reference/navigator) that keeps the navigation history in memory. Useful in tests and non-browser environments like [React Native](https://reactnative.dev/).

#### Usage

Create a `MemoryNavigator` instance and register some [routable components](https://layrjs.com/docs/v1/reference/routable#routable-component-class) into it.

See an example of use in the [`BrowserNavigator`](https://layrjs.com/docs/v1/reference/browser-navigator) class.

#### Creation

##### `new MemoryNavigator([options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a [`MemoryNavigator`](https://layrjs.com/docs/v1/reference/memory-navigator).

**Parameters:**

* `options`:
  * `initialURLs`: An array of URLs to populate the initial navigation history (default: `[]`).
  * `initialIndex`: A number specifying the current entry's index in the navigation history (default: the index of the last entry in the navigation history).

**Returns:**

The [`MemoryNavigator`](https://layrjs.com/docs/v1/reference/memory-navigator) instance that was created.

#### Current Location

See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v1/reference/navigator#current-location) class.

#### Navigation

See the methods that are inherited from the [`Navigator`](https://layrjs.com/docs/v1/reference/navigator#navigation) class.

#### Observability

See the methods that are inherited from the [`Observable`](https://layrjs.com/docs/v1/reference/observable#observable-class) class.
