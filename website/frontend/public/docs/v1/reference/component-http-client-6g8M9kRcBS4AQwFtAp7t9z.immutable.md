### ComponentHTTPClient <badge type="primary">class</badge> {#component-http-client-class}

*Inherits from [`ComponentClient`](https://layrjs.com/docs/v1/reference/component-client).*

A class allowing to access a root [`Component`](https://layrjs.com/docs/v1/reference/component) that is served by a [`ComponentHTTPServer`](https://layrjs.com/docs/v1/reference/component-http-server), a middleware such as [`component-express-middleware`](https://layrjs.com/docs/v1/reference/component-express-middleware), or any HTTP server exposing a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server).

#### Usage

Create an instance of `ComponentHTTPClient` by specifying the URL of the component server, and use the [`getComponent()`](https://layrjs.com/docs/v1/reference/component-http-client#get-component-instance-method) method to get the served component.

For example, to access a `Movie` component that is served by a component server, you could do the following:

```
// JS

// backend.js

import {Component, attribute, method, expose} from '@layr/component';
import {ComponentHTTPServer} from '@layr/component-http-server';

export class Movie extends Component {
  @expose({get: true, set: true}) @attribute('string') title;

  @expose({call: true}) @method() async play() {
    return `Playing `${this.title}`...`;
  }
}

const server = new ComponentHTTPServer(Movie, {port: 3210});

server.start();
```

```
// JS

// frontend.js

import {ComponentHTTPClient} from '@layr/component-http-client';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const Movie = await client.getComponent();

  const movie = new Movie({title: 'Inception'});

  await movie.play(); // => 'Playing Inception...'
})();
```

```
// TS

// backend.ts

import {Component, attribute, method, expose} from '@layr/component';
import {ComponentHTTPServer} from '@layr/component-http-server';

export class Movie extends Component {
  @expose({get: true, set: true}) @attribute('string') title!: string;

  @expose({call: true}) @method() async play() {
    return `Playing `${this.title}`...`;
  }
}

const server = new ComponentHTTPServer(Movie, {port: 3210});

server.start();
```

```
// TS

// frontend.ts

import {ComponentHTTPClient} from '@layr/component-http-client';

import type {Movie as MovieType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const Movie = (await client.getComponent()) as typeof MovieType;

  const movie = new Movie({title: 'Inception'});

  await movie.play(); // => 'Playing Inception...'
})();
```

#### Creation

##### `new ComponentHTTPClient(url, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a component HTTP client.

**Parameters:**

* `url`: A string specifying the URL of the component server to connect to.
* `options`:
  * `version`: A number specifying the expected version of the component server (default: `undefined`). If a version is specified, an error is thrown when a request is sent and the component server has a different version. The thrown error is a JavaScript `Error` instance with a `code` attribute set to `'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'`.
  * `mixins`: An array of the component mixins (e.g., [`Storable`](https://layrjs.com/docs/v1/reference/storable)) to use when constructing the components exposed by the component server (default: `[]`).
  * `retryFailedRequests`: A boolean or a function returning a boolean specifying whether a request should be retried in case of a network issue (default: `false`). In case a function is specified, the function will receive an object of the shape `{error, numberOfRetries}` where `error` is the error that has occurred and `numberOfRetries` is the number of retries that has been attempted so far. The function can be asynchronous ans should return a boolean.
  * `maximumRequestRetries`: The maximum number of times a request can be retried (default: `10`).
  * `minimumTimeBetweenRequestRetries`: A number specifying the minimum time in milliseconds that should elapse between each request retry (default: `3000`).

**Returns:**

A `ComponentHTTPClient` instance.

#### Getting the Served Component

##### `getComponent()` <badge type="secondary-outline">instance method</badge> <badge type="outline">async</badge> {#get-component-instance-method}

Gets the component that is served by the component server.

**Returns:**

A [`Component`](https://layrjs.com/docs/v1/reference/component) class.

**Example:**

See an [example of use](https://layrjs.com/docs/v1/reference/component-http-client#usage) above.