### ComponentClient <badge type="primary">class</badge> {#component-client-class}

A base class allowing to access a root [`Component`](https://layrjs.com/docs/v1/reference/component) that is served by a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server).

Typically, instead of using this class, you would use a subclass such as [`ComponentHTTPClient`](https://layrjs.com/docs/v1/reference/component-http-client).

#### Creation

##### `new ComponentClient(componentServer, [options])` <badge type="secondary">constructor</badge> {#constructor}

Creates a component client.

**Parameters:**

* `componentServer`: The [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) to connect to.
* `options`:
  * `version`: A number specifying the expected version of the component server (default: `undefined`). If a version is specified, an error is thrown when a request is sent and the component server has a different version. The thrown error is a JavaScript `Error` instance with a `code` attribute set to `'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'`.
  * `mixins`: An array of the component mixins (e.g., [`Storable`](https://layrjs.com/docs/v1/reference/storable)) to use when constructing the components exposed by the component server (default: `[]`).

**Returns:**

A `ComponentClient` instance.

**Example:**

```
// JS

import {Component, attribute, expose} from '@layr/component';
import {ComponentClient} from '@layr/component-client';
import {ComponentServer} from '@layr/component-server';

class Movie extends Component {
  @expose({get: true, set: true}) @attribute('string') title;
}

const server = new ComponentServer(Movie);
const client = new ComponentClient(server);

const RemoteMovie = client.getComponent();
```
```
// TS

import {Component, attribute, expose} from '@layr/component';
import {ComponentClient} from '@layr/component-client';
import {ComponentServer} from '@layr/component-server';

class Movie extends Component {
  @expose({get: true, set: true}) @attribute('string') title!: string;
}

const server = new ComponentServer(Movie);
const client = new ComponentClient(server);

const RemoteMovie = client.getComponent() as typeof Movie;
```

#### Getting the Served Component

##### `getComponent()` <badge type="secondary-outline">instance method</badge> <badge type="outline">possibly async</badge> {#get-component-instance-method}

Gets the component that is served by the component server.

**Returns:**

A [`Component`](https://layrjs.com/docs/v1/reference/component) class.

**Example:**

See [`constructor`'s example](https://layrjs.com/docs/v1/reference/component-client#constructor).