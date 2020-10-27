### Storing Data

In the [previous guide](https://layrjs.com/docs/v1/introduction/hello-world), we saw how to implement a minimal application with a frontend and a backend. Now let's add another layer to the stack — a database.

This time we're going to build a simple "Guestbook" application, which allows to store some messages in a database and retrieve them for display on the screen.

As with the ["Hello, World!"](https://layrjs.com/docs/v1/introduction/hello-world) application, we will implement a CLI frontend to make things easier. You'll see in the [next guide](https://layrjs.com/docs/v1/introduction/web-app) how to implement a web frontend.

> TLDR: The completed project is available in the <!-- <if language="js"> -->[Layr repository](https://github.com/layrjs/layr/tree/master/examples/guestbook-cli-js)<!-- </if> --><!-- <if language="ts"> -->[Layr repository](https://github.com/layrjs/layr/tree/master/examples/guestbook-cli-ts)<!-- </if> -->.

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

> Note that in a real application, we'd create different packages for the frontend part and the backend part of a full-stack project. But to keep this guide as simple as possible, we're going to put everything in a single package. See the <!-- <if language="js"> -->["CRUD Example App"](https://github.com/layrjs/crud-example-app-js-webpack)<!-- </if> --><!-- <if language="ts"> -->["CRUD Example App"](https://github.com/layrjs/crud-example-app-ts-webpack)<!-- </if> --> repository for an example of application that is organized into multiple packages.

#### Setting Up Your Development Environment

Repeat the same operations as in the ["Hello, World!"](https://layrjs.com/docs/v1/introduction/hello-world#setting-up-your-development-environment) application.

#### Implementing the Backend

First, install the Layr's packages we're going to use:

```sh
npm install @layr/component @layr/component-http-server \
  @layr/storable @layr/memory-store
```

In addition to `@layr/component` and `@layr/component-http-server` that we [already encountered](https://layrjs.com/docs/v1/introduction/hello-world#implementing-the-backend), we've installed:

- `@layr/storable` that provides the [`Storable()`](https://layrjs.com/docs/v1/reference/storable) mixin, which allows to extend a [`Component`](https://layrjs.com/docs/v1/reference/component) class with some storage capabilities.
- `@layr/memory-store` that provides the [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store) class, which is a minimal database storing everything in memory. Obviously, for a real application, you'd like to store your data more permanently, and for that, you can use the [`MongoDBStore`](https://layrjs.com/docs/v1/reference/mongodb-store) class which stores your data in a [MongoDB](https://www.mongodb.com/) database.

Now, create a file named <!-- <if language="js"> -->`backend.js`<!-- </if> --><!-- <if language="ts"> -->`backend.ts`<!-- </if> --> in an `src` directory, and write the following code:

```js
// JS

import {Component, expose, validators} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';
import {MemoryStore} from '@layr/memory-store';
import {ComponentHTTPServer} from '@layr/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
export class Message extends Storable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  message = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();
}

const store = new MemoryStore();

store.registerStorable(Message);

const server = new ComponentHTTPServer(Message, {port: 3210});

server.start();
```

```ts
// TS

import {Component, expose, validators} from '@layr/component';
import {Storable, primaryIdentifier, attribute} from '@layr/storable';
import {MemoryStore} from '@layr/memory-store';
import {ComponentHTTPServer} from '@layr/component-http-server';

const {notEmpty, maxLength} = validators;

@expose({
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: true}
  }
})
export class Message extends Storable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true, set: true})
  @attribute('string', {validators: [notEmpty(), maxLength(300)]})
  text = '';

  @expose({get: true}) @attribute('Date') createdAt = new Date();
}

const store = new MemoryStore();

store.registerStorable(Message);

const server = new ComponentHTTPServer(Message, {port: 3210});

server.start();
```

So what's going on there?

The `Message` class extends the [`Component`](https://layrjs.com/docs/v1/reference/component) class, which is itself extended by the [`Storable()`](https://layrjs.com/docs/v1/reference/storable) mixin, so the messages posted in our guestbook can be stored in a database.

Then, a couple of attributes are defined:

- The `id` attribute uniquely identifies a message. The [`@primaryIdentifier()`](https://layrjs.com/docs/v1/reference/component#primary-identifier-decorator) decorator is used to create a [`PrimaryIdentifierAttribute`](https://layrjs.com/docs/v1/reference/primary-identifier-attribute), which will automatically generate a unique string identifier for each message.
- The `text` attribute holds the text of a message. The [`@attribute()`](https://layrjs.com/docs/v1/reference/component#attribute-decorator) decorator is used to declare the [type of values](https://layrjs.com/docs/v1/reference/value-type) (`'string'`) the attribute can hold, and some [validators](https://layrjs.com/docs/v1/reference/validator) are specified so a message cannot be empty (`notEmpty()`) or too long (`maxLength(300)`).
- The `createdAt` attribute holds the creation date of a message. A default value (`new Date()`) is specified so any new message will get the current date automatically.

All the attributes are exposed to the frontend as follows:

- The `id` attribute can be read and set from the frontend. We need this attribute to be remotely-settable so the identifier of a message can be generated from the frontend. Don't worry, since a primary identifier, once set, cannot be changed, there is no risk that a frontend can maliciously change the `id` of an existing message.
- The `text` attribute can be read and set from the frontend as well.
- The `createdAt` attribute can be read from the frontend, but it cannot be set. Since we cannot trust the clock of a frontend, we leave this attribute to get its default value (`new Date()`) from the backend.

Just before the `Message` component definition, the [`@expose()`](https://layrjs.com/docs/v1/reference/component#expose-decorator) decorator is used to expose some methods that are provided by the [`Storable()`](https://layrjs.com/docs/v1/reference/storable) mixin:

- [`Message.find()`](https://layrjs.com/docs/v1/reference/storable#find-class-method) is exposed so the frontend can get a list of the guestbook's messages.
- [`Message.prototype.load()`](https://layrjs.com/docs/v1/reference/storable#load-instance-method) is exposed so the frontend can load a particular message.
- [`Message.prototype.save()`](https://layrjs.com/docs/v1/reference/storable#save-instance-method) is exposed so the frontend can add a new message. Note that this method also allows the frontend to update any existing message, and that's probably not what we want. But let's leave that for later when we [handle authorization](https://layrjs.com/docs/v1/introduction/authorization).

Once the `Message` component is defined, a [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store) is created, and the component is registered into it with the [`registerStorable()`](https://layrjs.com/docs/v1/reference/store#register-storable-instance-method) method.

Finally, a [`ComponentHTTPServer`](https://layrjs.com/docs/v1/reference/component-http-server) is created and then started.

Start the backend with the following command:

```sh
// JS

npx babel-node ./src/backend.js
```

```sh
// TS

npx ts-node ./src/backend.ts
```

If nothing happens on the screen, it's all good. The backend is running and waiting for requests.

#### Implementing the Frontend

First, install `@layr/component-http-client`, which will allow us to communicate with the backend.

```sh
npm install @layr/component-http-client
```

Then, create a file named <!-- <if language="js"> -->`frontend.js`<!-- </if> --><!-- <if language="ts"> -->`frontend.ts`<!-- </if> --> in the `src` directory, and write the following code:

```js
// JS

import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const Message = await client.getComponent();

  const text = process.argv[2];

  if (text) {
    addMessage(text);
  } else {
    showMessages();
  }

  async function addMessage(text) {
    const message = new Message({text});
    await message.save();
    console.log(`Message successfully added`);
  }

  async function showMessages() {
    const messages = await Message.find(
      {},
      {text: true, createdAt: true},
      {sort: {createdAt: 'desc'}, limit: 30}
    );

    for (const message of messages) {
      console.log(`[${message.createdAt.toISOString()}] ${message.text}`);
    }
  }
})();
```

```ts
// TS

import {ComponentHTTPClient} from '@layr/component-http-client';
import {Storable} from '@layr/storable';

import type {Message as MessageType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const Message = (await client.getComponent()) as typeof MessageType;

  const text = process.argv[2];

  if (text) {
    addMessage(text);
  } else {
    showMessages();
  }

  async function addMessage(text: string) {
    const message = new Message({text});
    await message.save();
    console.log(`Message successfully added`);
  }

  async function showMessages() {
    const messages = await Message.find(
      {},
      {text: true, createdAt: true},
      {sort: {createdAt: 'desc'}, limit: 30}
    );

    for (const message of messages) {
      console.log(`[${message.createdAt.toISOString()}] ${message.text}`);
    }
  }
})();
```

If you've followed the ["Hello, World!"](https://layrjs.com/docs/v1/introduction/hello-world) guide, you should be familiar with the beginning of the code which creates a [`ComponentHTTPClient`](https://layrjs.com/docs/v1/reference/component-http-client) and then calls the [`getComponent()`](https://layrjs.com/docs/v1/reference/component-http-client#get-component-instance-method) method to construct the `Message` component. The only difference is that, since the `Message` component is using the [`Storable()`](https://layrjs.com/docs/v1/reference/storable) mixin, we have to pass it to the `ComponentHTTPClient` constructor.

The rest of the code should be pretty self-explanatory, but let's dive into it anyway so we can better understand some particularities of Layr.

First, we get the `text` that can be specified as an argument ([`process.argv[2]`](https://nodejs.org/docs/latest/api/process.html#process_process_argv)) when the user executes the frontend from the terminal.

If some `text` was specified, we call the `addMessage()` function. Otherwise, we call the `showMessages()` function.

The `addMessage()` function creates a `Message` instance with the specified text and then calls the [`save()`](https://layrjs.com/docs/v1/reference/storable#save-instance-method) method, which is exposed by the backend and can, therefore, be remotely executed to save the message into the database.

Just before a component is saved, all its validators are automatically invoked, and if one of them fails, an error is thrown. You can, therefore, be assured that all data recorded in the database is valid according to the validators you have set up. So, in our case, all message texts should not be empty and not longer than 300 characters.

The `showMessages()` function calls the [`find()`](https://layrjs.com/docs/v1/reference/storable#find-class-method) method with three parameters:

- The first parameter (`{}`) specifies the query to be used when searching the messages in the database. In the present case, an empty object is specified, so any message can be returned.
- The second parameter (`{text: true, createdAt: true}`) specifies which attributes should be returned. Instead of an object describing the attributes to return, we could have specified `true` to return all the attributes of the `Message` component, but it is good practice to specify some attributes explicitly so we avoid data over-fetching when new attributes are added to a component.
- The third parameter (`{sort: {createdAt: 'desc'}, limit: 30}`) specifies some options to sort the messages by reverse-chronological order and limit the number of messages to 30.

Just like the `save()` method, the `find()` method is exposed by the backend, so it can be remotely executed to retrieve the messages from the database. Note that the `load()` method has to be exposed as well because it is called by the `find()` method under the hood so the `text` and `createdAt` attributes can be loaded. Otherwise, only the primary identifier attribute (`id`) would be accessible.

Let's start the frontend to make sure everything is working properly. While keeping the backend running, invoke the following command in another terminal to add a message in our guestbook:

```sh
// JS

npx babel-node ./src/frontend.js "First message"
```

```sh
// TS

npx ts-node ./src/frontend.ts "First message"
```

The following should be printed on the screen:

```sh
Message successfully added
```

Now, invoke the following command to display the messages available in the guestbook:

```sh
// JS

npx babel-node ./src/frontend.js
```

```sh
// TS

npx ts-node ./src/frontend.ts
```

The output should be something like this:

```sh
[2020-08-17T07:39:07.801Z] First message
```

Congratulations! Our "Guestbook" application is complete, and hopefully, you should start seeing how easy it is to build a full-stack application with Layr.
