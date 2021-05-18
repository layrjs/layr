### component-koa-middleware <badge type="primary">module</badge> {#component-koa-middleware-module}

A [Koa](https://koajs.com/) middleware allowing to serve a root [`Component`](https://layrjs.com/docs/v1/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://layrjs.com/docs/v1/reference/component-http-client).

#### Usage

Call the [`serveComponent()`](https://layrjs.com/docs/v1/reference/component-koa-middleware#serve-component-function) function to create a middleware for your Koa application.

**Example:**

```
import Koa from 'koa';
import {Component} from '@layr/component';
import {serveComponent} from '@layr/component-koa-middleware';

class Movie extends Component {
  // ...
}

const app = new Koa();

// Serve the `Movie` component at the root ('/')
app.use(serveComponent(Movie));

app.listen(3210);
```

If you want to serve your component at a specific URL, you can use [`koa-mount`](https://github.com/koajs/mount):

```
import mount from 'koa-mount';

// Serve the `Movie` component at a specific URL ('/api')
app.use(mount('/api', serveComponent(Movie)));
```

#### Functions

##### `serveComponent(componentOrComponentServer, [options])` <badge type="tertiary-outline">function</badge> {#serve-component-function}

Creates a [Koa](https://koajs.com/) middleware exposing the specified root [`Component`](https://layrjs.com/docs/v1/reference/component) class.

**Parameters:**

* `componentOrComponentServer`: The root [`Component`](https://layrjs.com/docs/v1/reference/component) class to serve. An instance of a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server).
* `options`:
  * `version`: A number specifying the version of the created [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) (default: `undefined`).

**Returns:**

A Koa middleware.
