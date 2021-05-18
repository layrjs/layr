### ComponentServer <badge type="primary">class</badge> {#component-server-class}

A base class allowing to serve a root [`Component`](https://layrjs.com/docs/v1/reference/component) so it can be accessed by a [`ComponentClient`](https://layrjs.com/docs/v1/reference/component-client).

Typically, instead of using this class, you would use a class such as [`ComponentHTTPServer`](https://layrjs.com/docs/v1/reference/component-http-server), or a middleware such as [`component-express-middleware`](https://layrjs.com/docs/v1/reference/component-express-middleware).

#### Creation

##### `new ComponentServer(component, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a component server.

**Parameters:**

* `component`: The root [`Component`](https://layrjs.com/docs/v1/reference/component) class to serve.
* `options`:
  * `version`: A number specifying the version of the returned component server (default: `undefined`).

**Returns:**

A `ComponentServer` instance.

**Example:**

See [`ComponentClient`'s example](https://layrjs.com/docs/v1/reference/component-client#constructor).