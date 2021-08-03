### ComponentHTTPServer <badge type="primary">class</badge> {#component-http-server-class}

A class allowing to serve a root [`Component`](https://layrjs.com/docs/v2/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://layrjs.com/docs/v2/reference/component-http-client).

This class provides a basic HTTP server providing one endpoint to serve your root component. If you wish to build an HTTP server providing multiple endpoints, you can use a middleware such as [`component-express-middleware`](https://layrjs.com/docs/v2/reference/component-express-middleware), or implement the necessary plumbing to integrate a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) in your custom HTTP server.

#### Usage

Create an instance of `ComponentHTTPServer` by specifying the root [`Component`](https://layrjs.com/docs/v2/reference/component) you want to serve, and use the [`start()`](https://layrjs.com/docs/v2/reference/component-http-server#start-instance-method) method to start the server.

See an example of use in [`ComponentHTTPClient`](https://layrjs.com/docs/v2/reference/component-http-client).

#### Creation

##### `new ComponentHTTPServer(componentOrComponentServer, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a component HTTP server.

**Parameters:**

* `componentOrComponentServer`: The root [`Component`](https://layrjs.com/docs/v2/reference/component) class to serve. An instance of a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server).
* `options`:
  * `port`: A number specifying the TCP port to listen to (default: `3333`).
  * `version`: A number specifying the version of the created [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) (default: `undefined`).

**Returns:**

A `ComponentHTTPServer` instance.

#### Methods

##### `start()` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#start-instance-method}

Starts the component HTTP server.

**Example:**

```
const server = new ComponentHTTPServer(Movie, {port: 3210});

await server.start();
```

##### `stop()` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#stop-instance-method}

Stops the component HTTP server.
