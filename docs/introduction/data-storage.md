### Storing Data

In our [previous guide](https://liaison.dev/docs/v1/introduction/hello-world), we saw how to implement a minimal application with a backend and a frontend. Now let's add another layer to the stack — a database.

We're going to build a simple "Guestbook" application, which allows to store some messages in a database, and retrieve them for display on the screen.

As with the ["Hello, World!"](https://liaison.dev/docs/v1/introduction/hello-world) application, we will implement a CLI frontend to make things easier. You'll see in the [next guide](https://liaison.dev/docs/v1/introduction/web-app) how to implement a web frontend.

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

Repeat the same operations as in the ["Hello, World!"](https://liaison.dev/docs/v1/introduction/hello-world#setting-up-your-development-environment) application.

#### Implementing the Backend

First, install the Liaison's packages we're going to use:

```sh
npm install @liaison/component @liaison/component-http-server \
  @liaison/storable @liaison/memory-store
```

In addition to `@liaison/component` and `@liaison/component-http-server` that we [already encountered](https://liaison.dev/docs/v1/introduction/hello-world#implementing-the-backend), we've installed:

- `@liaison/storable` that provides the [`Storable`](https://liaison.dev/docs/v1/reference/storable) mixin, which allows to extend a [`Component`](https://liaison.dev/docs/v1/reference/component) class with some storage capabilities.
- `@liaison/memory-store` that provides the [`MemoryStore`](https://liaison.dev/docs/v1/reference/memory-store) class, which is a minimal database persisting data in memory. Obviously, for a real application you'd like to store your data in a more permanent manner, and for that you can use the [`MongoDBStore`](https://liaison.dev/docs/v1/reference/mongodb-store) class which stores your data in a [MongoDB](https://www.mongodb.com/) database.

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

The `Message` class extends [`Component`](https://liaison.dev/docs/v1/reference/component), which is itself extended by [`Storable`](https://liaison.dev/docs/v1/reference/storable), so the messages posted in our guestbook can be stored in a database.

A couple of attributes are defined:

- The `id` attribute uniquely identifies a message. The [`@primaryIdentifier()`](https://liaison.dev/docs/v1/reference/component#primary-identifier-decorator) decorator is used to create a [`PrimaryIdentifierAttribute`](https://liaison.dev/docs/v1/reference/primary-identifier-attribute), which will automatically generate a unique string identifier for each message.
- The `text` attribute holds the text of a message. The [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator is used to declare the type of values (`'string'`) the attribute can hold, and some validators are specified so a message cannot be empty (`notEmpty()`) or too long (`maxLength(300)`).
- The `createdAt` attribute holds the creation date of a message. The default value (`new Date()`) is specified so any new message will get the current date automatically.

All the attributes are exposed to the frontend as follows:

- The `id` attribute can be get and set from the frontend. We need this attribute to be remotely-settable so the identifiers can be generated from the frontend. Don't worry, since a primary identifier cannot be changed once set, there is no risk that a frontend can maliciously change the `id` of an existing message.
- The `text` attribute can be get and set from the frontend as well.
- The `createdAt` attribute can be get from the frontend, but it cannot be set. Since we cannot trust the clock of a frontend, we leave this attribute get its default value (`new Date()`) from the backend.

Just before the `Message` component definition, the [`@expose()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator is used to expose some methods that are provided by the [`Storable`](https://liaison.dev/docs/v1/reference/storable) mixin:

- [`Message.find()`](https://liaison.dev/docs/v1/reference/storable#find-class-method) is exposed so the frontend can get a list of the guestbook's messages.
- [`Message.prototype.load()`](https://liaison.dev/docs/v1/reference/storable#load-instance-method) is exposed so the frontend can load a particular message.
- [`Message.prototype.save()`](https://liaison.dev/docs/v1/reference/storable#save-instance-method) is exposed so the frontend can add a new message. Note that this method also allows the frontend to update an existing message, and that's probably not what we want. But let's leave that for later when we [handle permissions](https://liaison.dev/docs/v1/introduction/permissions).

Once the `Message` component is defined, a [`MemoryStore`](https://liaison.dev/docs/v1/reference/memory-store) is created, and the component is registered into it with `store.registerStorable(Message)`.

Finally, a [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server) is created and then started.

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

First, install `@liaison/component-http-client`, which will allow us to communicate with the backend.

```sh
npm install @liaison/component-http-client
```

Then, create a file named <!-- <if language="js"> -->`frontend.js`<!-- </if> --><!-- <if language="ts"> -->`frontend.ts`<!-- </if> --> in the `src` directory, and write the following code:

```js
// JS

import {ComponentHTTPClient} from '@liaison/component-http-client';
import {Storable} from '@liaison/storable';

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

import {ComponentHTTPClient} from '@liaison/component-http-client';
import {Storable} from '@liaison/storable';

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

If you've followed the ["Hello, World!"](https://liaison.dev/docs/v1/introduction/hello-world) guide, you should be familiar with the beginning of the code which creates a [`ComponentHTTPClient`](https://liaison.dev/docs/v1/reference/component-http-client) and then calls the [`getComponent()`](https://liaison.dev/docs/v1/reference/component-client#get-component-instance-method) method to construct the `Message` component. The only difference is that, since the `Message` component is using the [`Storable`](https://liaison.dev/docs/v1/reference/storable) mixin, we have to pass it to the `ComponentHTTPClient` constructor.

The rest of the code should be pretty self-explanatory, but let's dive into it anyway so we can better understand some particularities of Liaison.

First, we get the `text` that is specified ([`process.argv[2]`](https://nodejs.org/docs/latest/api/process.html#process_process_argv)) when the user executes the frontend from the terminal.

If the `text` is not `undefined` and not empty, we call the `addMessage()` function. Otherwise, we call the `showMessages()` function.

The `addMessage()` function creates a `Message` instance with the specified text, and then calls the [`save()`](https://liaison.dev/docs/v1/reference/storable#save-instance-method) method, which is exposed by the backend, and can therefore be remotely executed to save the message into the database.

The `showMessages()` function calls the [`find()`](https://liaison.dev/docs/v1/reference/storable#find-class-method) method with three parameters:

- The first parameter (`{}`) specifies the query to be used when searching the messages in the database. In the present case, an empty object is specified, so all the messages can be potentially returned.
- The second parameter (`{text: true, createdAt: true}`) specifies which attributes should be returned. Instead of an object describing the attributes to return, we could have specified `true` to return all the attributes of the `Message` component, but it is good practice to specify some attributes explicitly so we avoid data over-fetching when new attributes are addedd to the component.
- The third parameter (`{sort: {createdAt: 'desc'}, limit: 30}`) specifies some options to sort the messages by reverse-chronological order and limit the number of messages to 30.

Just like the `save()` method, the `find()` method being exposed by the backend, it can be remotely executed to retrieve the messages from the database. Note that the `load()` method had to be exposed as well, because it is called by the`find()` method under the hood so the `text` and `createdAt` attributes can be loaded. Otherwise, only the primary identifier attribute (`id`) would be accessible.

Let's start the frontend to make sure everything is working properly. While keeping the backend running, invoke the following command to add a message in our guestbook:

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

Congratulations! Our "Guestbook" application is complete, and hopefully you should start seeing how easy it is to build a full-stack application with Liaison.
