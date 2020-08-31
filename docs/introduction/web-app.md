### Building a Web App

In the [previous guide](https://liaison.dev/docs/v1/introduction/data-storage), we saw how to implement a simple "Guestbook" application with a CLI frontend, a backend, and a database. Now we're going to improve the user experience by replacing the CLI frontend with a web frontend.

#### Bootstrapping the Project

Since we're going to use the same backend as before, you can duplicate the [previous project](https://liaison.dev/docs/v1/introduction/data-storage) or simply modify it in place.

#### Setting Up Your Development Environment

<!-- <if language="js"> -->

##### Babel

We're going to use [React](https://reactjs.org/) to build the web frontend, so we need to configure [Babel](https://babeljs.io/) accordingly.

> Note that we've chosen to use React because we think it fits well in the context of an application built with Liaison. But Liaison is in no way dependent on React, and you are free to use the frontend library of your choice.

First, install the `@babel/preset-react` package:

```sh
npm install --save-dev @babel/preset-react
```

Then, modify the `babel.config.json` file as follows:

```json
{
  "presets": [
    ["@babel/preset-env", {"targets": {"node": "10"}}],
    "@babel/preset-react"
  ],
  "plugins": [
    ["@babel/plugin-proposal-decorators", {"legacy": true}],
    ["@babel/plugin-proposal-class-properties"]
  ]
}
```

<!-- </if> -->

<!-- <if language="ts"> -->

##### TypeScript

We're going to use [React](https://reactjs.org/) to build the web frontend, so we need to configure the [TypeScript](https://www.typescriptlang.org/) compiler accordingly.

> Note that we've chosen to use React because we think it fists well in the context of an application built with Liaison. But Liaison is in no way dependent on React, and you are free to use the frontend library of your choice.

Modify the `tsconfig.json` file as follows:

```json
{
  "include": ["src/**/*"],
  "compilerOptions": {
    "target": "ES2018",
    "module": "CommonJS",
    "lib": ["ES2018", "DOM"],
    "jsx": "react",
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "experimentalDecorators": true
  }
}
```

<!-- </if> -->

##### Webpack

We'll use [Webpack](https://webpack.js.org/) to bundle the code of the frontend, so let's install the required packages:

```sh
// JS

npm install --save-dev webpack webpack-cli webpack-dev-server \
  babel-loader html-webpack-plugin
```

```sh
// TS

npm install --save-dev webpack webpack-cli webpack-dev-server \
  ts-loader html-webpack-plugin
```

Next, create a `webpack.config.js` file at the root of your project with the following content:

```js
// JS

const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  return {
    // The entry point of the app is './src/frontend.js'
    entry: './src/frontend.js',
    module: {
      rules: [
        {
          // Use 'babel-loader' to compile the JS files
          test: /\.js$/,
          include: path.join(__dirname, 'src'),
          loader: 'babel-loader'
        }
      ]
    },
    plugins: [
      // Use 'html-webpack-plugin' to generate the 'index.html' file
      // from the './src/index.html' template
      new HtmlWebPackPlugin({
        template: './src/index.html',
        inject: false
      })
    ],
    // Generate source maps to make debugging easier
    devtool: 'eval-cheap-module-source-map'
  };
};
```

```js
// TS

const webpack = require('webpack');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  return {
    // The entry point of the app is './src/frontend.tsx'
    entry: './src/frontend.tsx',
    module: {
      rules: [
        {
          // Use 'ts-loader' to compile the TS files
          test: /\.tsx?$/,
          include: path.join(__dirname, 'src'),
          loader: 'ts-loader'
        }
      ]
    },
    plugins: [
      // Use 'html-webpack-plugin' to generate the 'index.html' file
      // from the './src/index.html' template
      new HtmlWebPackPlugin({
        template: './src/index.html',
        inject: false
      })
    ],
    // Generate source maps to make debugging easier
    devtool: 'eval-cheap-module-source-map'
  };
};
```

> Note that this is a "minimal" Webpack configuration for a simple development environment. You'll need a slightly more advanced configuration to generate a bundle that is suitable for production deployment. See the <!-- <if language="js"> -->["CRUD Example App"](https://github.com/liaisonjs/crud-example-app-js-webpack)<!-- </if> --><!-- <if language="ts"> -->["CRUD Example App"](https://github.com/liaisonjs/crud-example-app-ts-webpack)<!-- </if> --> repository for an example of a configuration that works pretty well for both development and production.

#### Starting the Backend

The [backend](https://liaison.dev/docs/v1/introduction/data-storage#implementing-the-backend) is fine as it is, so all you need to do is to start it if it isn't already running:

```sh
// JS

npx babel-node ./src/backend.js
```

```sh
// TS

npx ts-node ./src/backend.ts
```

#### Reimplementing the Frontend

We're going to transform the previous [CLI frontend](https://liaison.dev/docs/v1/introduction/data-storage#implementing-the-frontend) into a web frontend, and we'll use [React](https://reactjs.org/) to take care of the UI rendering.

First, install the required packages:

```sh
// JS

npm install react react-dom @liaison/react-integration
```

```sh
// TS

npm install react react-dom @liaison/react-integration
npm install --save-dev @types/react @types/react-dom
```

Note that in addition to React, we've also installed [`@liaison/react-integration`](https://liaison.dev/docs/v1/reference/react-integration) which simplifies the use of React in a Liaison application.

Next, create an `index.html` file in the `src` directory, and write the following content:

<!-- prettier-ignore -->
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Guestbook</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <%= htmlWebpackPlugin.tags.headTags %>
  </head>
  <body>
    <noscript><p>Sorry, this site requires JavaScript to be enabled.</p></noscript>
    <div id="root"></div>
    <%= htmlWebpackPlugin.tags.bodyTags %>
  </body>
</html>
```

There is nothing particularly remarkable so far. We've just created a basic HTML file that serves as a shell for our application.

Now that all the boring stuff is in place, we can finally get into the "meat" of the application — the <!-- <if language="js"> -->JavaScript<!-- </if> --><!-- <if language="ts"> -->TypeScript<!-- </if> --> code.

<!-- <if language="js"> -->

Modify the `src/frontend.js` file as follows:

<!-- </if> -->

<!-- <if language="ts"> -->

Rename the `src/frontend.ts` file to `src/frontend.tsx` and modify its content as follows:

<!-- </if> -->

```js
// JS

import React from 'react';
import ReactDOM from 'react-dom';
import {Component, attribute, provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {view, useAsyncCall, useAsyncCallback} from '@liaison/react-integration';

async function main() {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const BackendMessage = await client.getComponent();

  class Message extends BackendMessage {
    @view() View() {
      return (
        <p>
          <small>{this.createdAt.toLocaleString()}</small>
          <br />
          <strong>{this.text}</strong>
        </p>
      );
    }

    @view() Editor({onSubmit}) {
      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(
        async (event) => {
          event.preventDefault();
          await onSubmit();
        },
        []
      );

      return (
        <form onSubmit={handleSubmit}>
          <div>
            <textarea
              value={this.text}
              onChange={(event) => {
                this.text = event.target.value;
              }}
              required
              style={{width: '100%', height: '80px'}}
            />
          </div>

          <p>
            <button type="submit" disabled={isSubmitting}>
              Submit
            </button>
          </p>

          {submitError && (
            <p style={{color: 'red'}}>
              Sorry, an error occurred while submitting your message.
            </p>
          )}
        </form>
      );
    }
  }

  class Guestbook extends Component {
    @provide() static Message = Message;

    @attribute('Message[]?') existingMessages;
    @attribute('Message') userMessage = new this.constructor.Message();

    @view() View() {
      const {Message} = this.constructor;

      const [isLoading] = useAsyncCall(async () => {
        this.existingMessages = await Message.find(
          {},
          {text: true, createdAt: true},
          {sort: {createdAt: 'desc'}, limit: 30}
        );
      }, []);

      const [addMessage] = useAsyncCallback(async () => {
        await this.userMessage.save();
        this.existingMessages = [this.userMessage, ...this.existingMessages];
        this.userMessage = new Message();
      }, []);

      if (isLoading) {
        return null;
      }

      if (this.existingMessages === undefined) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading the guestbook’s messages.
          </p>
        );
      }

      return (
        <div style={{maxWidth: '700px', margin: '40px auto'}}>
          <h1>Guestbook</h1>

          <h2>All Messages</h2>

          {this.existingMessages.length > 0 ? (
            this.existingMessages.map((message) => (
              <message.View key={message.id} />
            ))
          ) : (
            <p>No messages yet.</p>
          )}

          <h2>Add a Message</h2>

          <this.userMessage.Editor onSubmit={addMessage} />
        </div>
      );
    }
  }

  const guestbook = new Guestbook();

  ReactDOM.render(<guestbook.View />, document.getElementById('root'));
}

main().catch((error) => console.error(error));
```

```ts
// TS

import React from 'react';
import ReactDOM from 'react-dom';
import {Component, attribute, provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {view, useAsyncCall, useAsyncCallback} from '@liaison/react-integration';

import type {Message as MessageType} from './backend';

async function main() {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const BackendMessage = (await client.getComponent()) as typeof MessageType;

  class Message extends BackendMessage {
    @view() View() {
      return (
        <p>
          <small>{this.createdAt.toLocaleString()}</small>
          <br />
          <strong>{this.text}</strong>
        </p>
      );
    }

    @view() Editor({onSubmit}: {onSubmit: () => Promise<void>}) {
      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(
        async (event) => {
          event.preventDefault();
          await onSubmit();
        },
        []
      );

      return (
        <form onSubmit={handleSubmit}>
          <div>
            <textarea
              value={this.text}
              onChange={(event) => {
                this.text = event.target.value;
              }}
              required
              style={{width: '100%', height: '80px'}}
            />
          </div>

          <p>
            <button type="submit" disabled={isSubmitting}>
              Submit
            </button>
          </p>

          {submitError && (
            <p style={{color: 'red'}}>
              Sorry, an error occurred while submitting your message.
            </p>
          )}
        </form>
      );
    }
  }

  class Guestbook extends Component {
    ['constructor']!: typeof Guestbook;

    @provide() static Message = Message;

    @attribute('Message[]?') existingMessages?: Message[];
    @attribute('Message') userMessage = new this.constructor.Message();

    @view() View() {
      const {Message} = this.constructor;

      const [isLoading] = useAsyncCall(async () => {
        this.existingMessages = await Message.find(
          {},
          {text: true, createdAt: true},
          {sort: {createdAt: 'desc'}, limit: 30}
        );
      }, []);

      const [addMessage] = useAsyncCallback(async () => {
        await this.userMessage.save();
        this.existingMessages = [this.userMessage, ...this.existingMessages!];
        this.userMessage = new Message();
      }, []);

      if (isLoading) {
        return null;
      }

      if (this.existingMessages === undefined) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading the guestbook’s messages.
          </p>
        );
      }

      return (
        <div style={{maxWidth: '700px', margin: '40px auto'}}>
          <h1>Guestbook</h1>

          <h2>All Messages</h2>

          {this.existingMessages.length > 0 ? (
            this.existingMessages.map((message) => (
              <message.View key={message.id} />
            ))
          ) : (
            <p>No messages yet.</p>
          )}

          <h2>Add a Message</h2>

          <this.userMessage.Editor onSubmit={addMessage} />
        </div>
      );
    }
  }

  const guestbook = new Guestbook();

  ReactDOM.render(<guestbook.View />, document.getElementById('root'));
}

main().catch((error) => console.error(error));
```

There is a significant amount of code, but if you know a bit of React, it should be pretty easy to read. Compared to the previous [CLI frontend](https://liaison.dev/docs/v1/introduction/data-storage#implementing-the-frontend), we've introduced a few new Liaison concepts though, so we are going to explore them. But before that, let's start the frontend so you can see how it looks like.

#### Starting the Frontend

Start the frontend by invoking the following command:

```sh
npx webpack-dev-server
```

Then open [http://localhost:8080/](http://localhost:8080/) in a browser, and you should see the following display:

<p>
	<img src="https://liaison-blog.s3.dualstack.us-west-2.amazonaws.com/images/guestbook-screen-1.png" alt="Screenshot of the guestbook app with no messages" style="width: 100%; margin-top: .5rem">
</p>

Submit a message, and you should now see something like this:

<p>
	<img src="https://liaison-blog.s3.dualstack.us-west-2.amazonaws.com/images/guestbook-screen-2.png" alt="Screenshot of the guestbook app with one message" style="width: 100%; margin-top: .5rem">
</p>

Just to make sure that your message was persisted into the backend, refresh the browser, and you should see that your message is indeed still there.

#### Making Sense of the Frontend

The frontend is made of two components:

- `Message` inherits from the backend's `Message` component thanks to the cross-layer component inheritance ability.
- `Guestbook` defines a [`Component`](https://liaison.dev/docs/v1/reference/component) that is unique to the frontend.

##### `Message` Component

Liaison embraces the object-oriented approach in all aspects of an application and allows you to organize your code in a way that is as cohesive as possible. Traditionally, domain models and UI views are completely separated, but we think that [another way is possible](https://liaison.dev/blog/articles/Do-We-Really-Need-to-Separate-the-Model-from-the-UI-9wogqr). So, the "Liaison way" is to co-locate a model and its views in the same place — a Liaison [`Component`](https://liaison.dev/docs/v1/reference/component).

The `Message` component is composed (besides the attributes and the methods that are inherited from the backend) of two views:

- `View()` represents a simple view to display a message.
- `Editor()` represents a simple form to edit and submit a message.

Both views are just methods that return some [React elements](https://reactjs.org/docs/rendering-elements.html) and they are prefixed with the [`@view()`](https://liaison.dev/docs/v1/reference/react-integration#view-decorator) decorator that essentially does two things:

- First, it binds a view's method to a specific component, so when the method is executed by React (through a reference included in a [JSX expression](https://reactjs.org/docs/introducing-jsx.html)), it has access to the bound component through `this`.
- Second, it observes the attributes of the bound component, so when the value of an attribute changes, the view is automatically re-rendered.

The `View()` method is quite self-explanatory. It just wraps some message's attributes in a few HTML elements.

The `Editor()` method returns a `form` element and implements a bit of logic so the user can interact with it. The [`useAsyncCallback()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-callback-react-hook) hook, although not specific to Liaison, is provided by the [`@liaison/react-integration`](https://liaison.dev/docs/v1/reference/react-integration) package. This hook is a handy way to track the execution of an async function, and in our case, it is used to track the form submission. So when the form is being submitted, the "Submit" button is disabled, and if the submission fails, an error is displayed. The rest of the method is just regular React code.

##### `Guestbook` Component

The `Guestbook` component is the core of the application. It contains an attribute (`existingMessages`) to keep track of the displayed messages, and it has a second attribute (`userMessage`) to hold a message that the user can edit and submit. Also, the `Guestbook` component provides a view (simply named `View()`) to display the whole application.

<!-- <if language="js"> -->

At the very beginning of the `Guestbook` class, the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator is used to make the `Guestbook` component aware of the `Message` component. Doing so allows us to specify the `'Message'` type when we define the `existingMessages` and `userMessage` attributes with the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.

<!-- </if> -->

<!-- <if language="ts"> -->

At the very beginning of the `Guestbook` class, we use a little TypeScript trick so the `Guestbook` class type can be accessed through the `constructor` attribute of any `Guestbook` instance.

Then, the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator is used to make the `Guestbook` component aware of the `Message` component. Doing so allows us to specify the `'Message'` type when we define the `existingMessages` and `userMessage` attributes with the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.

<!-- </if> -->

Note that the `userMessage` attribute has a default value which is a new instance of `Message`, and to create this instance, we invoke `new this.constructor.Message()` instead of just `new Message()`. The former is a bit more verbose but it brings a lot of benefits. First, it is a good practice to reduce the direct references to an external component as much as possible. Second, when we access a component through a reference that is managed by the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator, we can take advantage of some advanced Liaison's features such as [component forking](https://liaison.dev/docs/v1/reference/component?language=js#forking).

Then comes the `View()` method that is pretty straightforward. It's like a React function component, except that it is a method executed with a Liaison component (a `Guestbook` instance) as `this` context.

Just like the [`useAsyncCallback()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-callback-react-hook) hook, the [`useAsyncCall()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-call-react-hook) hook allows us to track the execution of an async function, but the function is automatically called when the view is rendered for the first time. In the present case, the function loads some `Message` instances from the backend by using the [`find()`](https://liaison.dev/docs/v1/reference/storable#find-class-method) method in the same way as in the previous [CLI frontend](https://liaison.dev/docs/v1/introduction/data-storage#implementing-the-frontend).

The `addMessage()` function is defined through the [`useAsyncCallback()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-callback-react-hook) hook and it is later passed to the Message's `Editor()` view so the `userMessage` can be saved when the user clicks the "Submit" button.

> Note that since we don't track the execution of the `addMessage()` function, the React's built-in [`useCallback()`](https://reactjs.org/docs/hooks-reference.html#usecallback) hook could be used as well.

Once the `userMessage` is saved, we add it to the `existingMessages` so it can be instantly displayed with all other messages. Then, we set the `userMessage` to a new `Message` instance so the user can write another message if he wants.

Finally, an instance of `Guestbook` is created, and `<guestbook.View() />` is mounted into the DOM with [`ReactDOM.render()`](https://reactjs.org/docs/react-dom.html#render).

#### Wrapping Up

We've built a simple web app with a frontend, a backend, and a database. And thanks to Liaison, we were able to free ourselves from several boring tasks that we usually encounter:

- We didn't have to build a web API to connect the frontend and the backend.
- To interact with the database, there was no need to add an ORM or a query builder.
- To build the frontend, we didn't have to bother with a state manager.

If you are a seasoned React developer or a functional programming advocate, you might be a little surprised by the way the frontend was implemented. But please don't judge too quickly, give Liaison a try, and hopefully, you'll see how your projects could be dramatically simplified with the object-oriented approach that Liaison is enabling.
