### component-express-middleware <badge type="primary">module</badge> {#component-express-middleware-module}

An [Express](https://expressjs.com/) middleware allowing to serve a root [`Component`](https://layrjs.com/docs/v2/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://layrjs.com/docs/v2/reference/component-http-client).

#### Usage

Call the [`serveComponent()`](https://layrjs.com/docs/v2/reference/component-express-middleware#serve-component-function) function to create a middleware for your Express application.

**Example:**

```
import express from 'express';
import {Component} from '@layr/component';
import {serveComponent} from '@layr/component-express-middleware';

class Movie extends Component {
  // ...
}

const app = express();

app.use('/api', serveComponent(Movie));

app.listen(3210);
```

#### Functions

##### `serveComponent(componentOrComponentServer, [options])` <badge type="tertiary-outline">function</badge> {#serve-component-function}

Creates an [Express](https://expressjs.com/) middleware exposing the specified root [`Component`](https://layrjs.com/docs/v2/reference/component) class.

**Parameters:**

* `componentOrComponentServer`: The root [`Component`](https://layrjs.com/docs/v2/reference/component) class to serve. An instance of a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server).
* `options`:
  * `version`: A number specifying the version of the created [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) (default: `undefined`).

**Returns:**

An Express middleware.
