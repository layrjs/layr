### Storing Data

In our [previous guide](https://liaison.dev/docs/v1/getting-started/hello-world), we saw how to implement a minimal application with a backend and a frontend. Now let's add another layer to the stack — a database.

We're going to build a simple "Guestbook" application, which allows to store some messages in a database, and retrieve them for display on the screen.

As with the ["Hello, World!"](https://liaison.dev/docs/v1/getting-started/hello-world) application, we will implement a CLI frontend to make things easier. You'll see in the [next guide](https://liaison.dev/docs/v1/getting-started/web-app) how to implement a web frontend.

#### Creating the Project

First, from your terminal, create a directory for your project, and navigate into it:

```sh
mkdir guest-book-cli
cd guest-book-cli
```

Then, initialize your project with:

```sh
npm init -y
```

#### Setting Up Your Development Environment

Repeat the same operations as in the ["Hello, World!"](https://liaison.dev/docs/v1/getting-started/hello-world#setting-up-your-development-environment) application.

#### Implementing the Backend

First, install the Liaison's packages we're going to use:

```sh
npm install @liaison/component @liaison/component-http-server \
  @liaison/storable @liaison/memory-store
```

In addition to `@liaison/component` and `@liaison/component-http-server` that we [already encountered](https://liaison.dev/docs/v1/getting-started/hello-world#implementing-the-backend), we've installed:

- `@liaison/storable` that provides the [`Storable`](https://liaison.dev/docs/v1/reference/storable) mixin, which allows to extend a [`Component`](https://liaison.dev/docs/v1/reference/component) class with some storage capabilities.
- `@liaison/memory-store` that provides the [`MemoryStore`](https://liaison.dev/docs/v1/reference/memory-store) class, which is minimal database persisting data in memory. Obviously, for a real application you'd like to store your data in a more permanent manner, and for that you can use the [`MongoDBStore`](https://liaison.dev/docs/v1/reference/mongodb-store) class which stores your data in a [MongoDB](https://www.mongodb.com/) database.

Now, create a file named <!-- <if language="js"> -->`backend.js`<!-- </if> --><!-- <if language="ts"> -->`backend.ts`<!-- </if> --> in an `src` directory, and write the following code:

```js
// JS

import {Component, expose, validators} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';
import {MemoryStore} from '@liaison/memory-store';
import {ComponentHTTPServer} from '@liaison/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
export class Entry extends Storable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  message = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();
}

const store = new MemoryStore();

store.registerStorable(Entry);

const server = new ComponentHTTPServer(Entry, {port: 3210});

server.start();
```

```ts
// TS

import {Component, expose, validators} from '@liaison/component';
import {Storable, primaryIdentifier, attribute} from '@liaison/storable';
import {MemoryStore} from '@liaison/memory-store';
import {ComponentHTTPServer} from '@liaison/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
export class Entry extends Storable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  message = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();
}

const store = new MemoryStore();

store.registerStorable(Entry);

const server = new ComponentHTTPServer(Entry, {port: 3210});

server.start();
```

[To be continued]
