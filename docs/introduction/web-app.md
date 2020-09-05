### Building a Web App

In the [previous guide](https://liaison.dev/docs/v1/introduction/data-storage), we saw how to implement a simple "Guestbook" application with a CLI frontend, a backend, and a database. Now we're going to improve the user experience by replacing the CLI frontend with a web frontend.

> TLDR: The completed project is available in the <!-- <if language="js"> -->[Liaison repository](https://github.com/liaisonjs/liaison/tree/master/examples/guestbook-web-js)<!-- </if> --><!-- <if language="ts"> -->[Liaison repository](https://github.com/liaisonjs/liaison/tree/master/examples/guestbook-web-ts)<!-- </if> -->.

#### Preparing the Project

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
    output: {
      // Specify '/' as the base path for all the assets
      // This is required for a single-page application
      publicPath: '/'
    },
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
    devtool: 'eval-cheap-module-source-map',
    devServer: {
      // Fallback to 'index.html' in case of 404 responses
      // This is required for a single-page application
      historyApiFallback: true
    }
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
    output: {
      // Specify '/' as the base path for all the assets
      // This is required for a single-page application
      publicPath: '/'
    },
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
    devtool: 'eval-cheap-module-source-map',
    devServer: {
      // Fallback to 'index.html' in case of 404 responses
      // This is required for a single-page application
      historyApiFallback: true
    }
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

Note that in addition to React, we've also installed [`@liaison/react-integration`](https://liaison.dev/docs/v1/reference/react-integration) to simplify the use of React inside Liaison components.

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

import React, {useCallback} from 'react';
import ReactDOM from 'react-dom';
import {Component, attribute, provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {
  view,
  useAsyncCall,
  useAsyncCallback,
  useRecomputableMemo
} from '@liaison/react-integration';

async function main() {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const BackendMessage = await client.getComponent();

  class Message extends BackendMessage {
    @view() Viewer() {
      return (
        <div>
          <small>{this.createdAt.toLocaleString()}</small>
          <br />
          <strong>{this.text}</strong>
        </div>
      );
    }

    @view() Form({onSubmit}) {
      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(
        async (event) => {
          event.preventDefault();
          await onSubmit();
        }
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

    @attribute('Message[]') static existingMessages = [];

    @view() static Home() {
      return (
        <div style={{maxWidth: '700px', margin: '40px auto'}}>
          <h1>Guestbook</h1>
          <this.MessageList />
          <this.MessageCreator />
        </div>
      );
    }

    @view() static MessageList() {
      const {Message} = this;

      const [isLoading, loadingError] = useAsyncCall(async () => {
        this.existingMessages = await Message.find(
          {},
          {text: true, createdAt: true},
          {sort: {createdAt: 'desc'}, limit: 30}
        );
      });

      if (isLoading) {
        return null;
      }

      if (loadingError) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading the guestbook’s messages.
          </p>
        );
      }

      return (
        <div>
          <h2>All Messages</h2>
          {this.existingMessages.length > 0 ? (
            this.existingMessages.map((message) => (
              <div key={message.id} style={{marginTop: '15px'}}>
                <message.Viewer />
              </div>
            ))
          ) : (
            <p>No messages yet.</p>
          )}
        </div>
      );
    }

    @view() static MessageCreator() {
      const {Message} = this;

      const [createdMessage, resetCreatedMessage] = useRecomputableMemo(
        () => new Message()
      );

      const saveMessage = useCallback(async () => {
        await createdMessage.save();
        this.existingMessages = [createdMessage, ...this.existingMessages];
        resetCreatedMessage();
      }, [createdMessage]);

      return (
        <div>
          <h2>Add a Message</h2>
          <createdMessage.Form onSubmit={saveMessage} />
        </div>
      );
    }
  }

  ReactDOM.render(<Guestbook.Home />, document.getElementById('root'));
}

main().catch((error) => console.error(error));
```

```ts
// TS

import React, {useCallback} from 'react';
import ReactDOM from 'react-dom';
import {Component, attribute, provide} from '@liaison/component';
import {Storable} from '@liaison/storable';
import {ComponentHTTPClient} from '@liaison/component-http-client';
import {
  view,
  useAsyncCall,
  useAsyncCallback,
  useRecomputableMemo
} from '@liaison/react-integration';

import type {Message as MessageType} from './backend';

async function main() {
  const client = new ComponentHTTPClient('http://localhost:3210', {
    mixins: [Storable]
  });

  const BackendMessage = (await client.getComponent()) as typeof MessageType;

  class Message extends BackendMessage {
    @view() Viewer() {
      return (
        <div>
          <small>{this.createdAt.toLocaleString()}</small>
          <br />
          <strong>{this.text}</strong>
        </div>
      );
    }

    @view() Form({onSubmit}: {onSubmit: () => Promise<void>}) {
      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(
        async (event) => {
          event.preventDefault();
          await onSubmit();
        }
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

    @attribute('Message[]') static existingMessages: Message[] = [];

    @view() static Home() {
      return (
        <div style={{maxWidth: '700px', margin: '40px auto'}}>
          <h1>Guestbook</h1>
          <this.MessageList />
          <this.MessageCreator />
        </div>
      );
    }

    @view() static MessageList() {
      const {Message} = this;

      const [isLoading, loadingError] = useAsyncCall(async () => {
        this.existingMessages = await Message.find(
          {},
          {text: true, createdAt: true},
          {sort: {createdAt: 'desc'}, limit: 30}
        );
      });

      if (isLoading) {
        return null;
      }

      if (loadingError) {
        return (
          <p style={{color: 'red'}}>
            Sorry, an error occurred while loading the guestbook’s messages.
          </p>
        );
      }

      return (
        <div>
          <h2>All Messages</h2>
          {this.existingMessages.length > 0 ? (
            this.existingMessages.map((message) => (
              <div key={message.id} style={{marginTop: '15px'}}>
                <message.Viewer />
              </div>
            ))
          ) : (
            <p>No messages yet.</p>
          )}
        </div>
      );
    }

    @view() static MessageCreator() {
      const {Message} = this;

      const [createdMessage, resetCreatedMessage] = useRecomputableMemo(
        () => new Message()
      );

      const saveMessage = useCallback(async () => {
        await createdMessage.save();
        this.existingMessages = [createdMessage, ...this.existingMessages];
        resetCreatedMessage();
      }, [createdMessage]);

      return (
        <div>
          <h2>Add a Message</h2>
          <createdMessage.Form onSubmit={saveMessage} />
        </div>
      );
    }
  }

  ReactDOM.render(<Guestbook.Home />, document.getElementById('root'));
}

main().catch((error) => console.error(error));
```

> Note that in a real application, we'd spread the code into multiple files. For example, we'd have one file for each class and one more file for the `main()` function. But to keep this guide simple, we've put everything in a single file. See the <!-- <if language="js"> -->["CRUD Example App"](https://github.com/liaisonjs/crud-example-app-js-webpack)<!-- </if> --><!-- <if language="ts"> -->["CRUD Example App"](https://github.com/liaisonjs/crud-example-app-ts-webpack)<!-- </if> --> repository for an example of a codebase that is organized into multiple files.

There is a bunch of code, but if you know a bit of React, it should be pretty easy to read. Compared to the previous [CLI frontend](https://liaison.dev/docs/v1/introduction/data-storage#implementing-the-frontend), we've introduced a few new Liaison concepts, and we're going to explore them. But before that, let's start the frontend so you can see how it looks like.

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

Just to make sure that your message is stored into the backend, refresh the browser, and you should see that your message is indeed still there.

#### Making Sense of the Frontend

The frontend is made of two components:

- `Message` inherits from the backend's `Message` component thanks to the cross-layer component inheritance ability.
- `Guestbook` defines a new [`Component`](https://liaison.dev/docs/v1/reference/component).

##### `Message` Component

Liaison embraces the object-oriented approach in all aspects of an application and allows you to organize your code in a way that is as cohesive as possible. Traditionally, domain models and UI views are completely separated, but we think that [another way is possible](https://liaison.dev/blog/articles/Do-We-Really-Need-to-Separate-the-Model-from-the-UI-9wogqr). So, the "Liaison way" is to co-locate a model and its views in the same place — a Liaison [`Component`](https://liaison.dev/docs/v1/reference/component).

The `Message` component is composed (besides the attributes and methods that are inherited from the backend) of two views:

- `Viewer()` represents a view to display a message.
- `Form()` represents a form to edit a message.

Both views are just methods that return some [React elements](https://reactjs.org/docs/rendering-elements.html) and they are prefixed with the [`@view()`](https://liaison.dev/docs/v1/reference/react-integration#view-decorator) decorator that essentially does two things:

- First, it binds a "view method" to a specific component, so when the method is executed by React (via, for example, a reference included in a [JSX expression](https://reactjs.org/docs/introducing-jsx.html)), it has access to the bound component through `this`.
- Second, it observes the attributes of the bound component, so when the value of an attribute changes, the view is automatically re-rendered.

###### `Viewer()` View

The `Viewer()` view is quite self-explanatory. It just wraps some message's attributes in some HTML elements.

###### `Form()` View

The `Form()` view returns a `form` element and implements a bit of logic so the user can interact with to form.

We use the [`useAsyncCallback()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-callback-react-hook) hook, which is a handy way to track the execution of an asynchronous function. In our case, it is used to track the form submission. So when the form is being submitted, the "Submit" button is disabled, and if the submission fails, an error is displayed.

The rest of the method is just regular React code.

##### `Guestbook` Component

The `Guestbook` component is the core of the application. It contains an attribute (`existingMessages`) to keep track of the displayed messages, and it provides a couple of views (`Home()`, `MessageList()`, and `MessageCreator()`) to display the whole application.

At the very beginning of the class, the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator is used to make the `Guestbook` component aware of the `Message` component. Doing so allows us to specify the `'Message'` type as a parameter of the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator to define the `existingMessages` attribute.

Another benefit of using the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator is that we can access the `Message` component through `this.Message` from any `Guestbook`'s class method (or through `this.constructor.Message` from any instance method), and doing so brings a lot of advantages. First, it is a good practice to reduce the direct references to an external component as much as possible. Second, accessing a component through a reference that is managed by the [`@provide()`](https://liaison.dev/docs/v1/reference/component#provide-decorator) decorator enables some unique Liaison's features such as [component forking](https://liaison.dev/docs/v1/reference/component?language=js#forking).

###### `Home()` View

The `Home()` view is pretty straightforward. It just renders other views (`MessageList()` and `MessageCreator()`) in a minimal layout.

###### `MessageList()` View

The `MessageList()` view is in charge of loading some messages from the backend and rendering them.

We use the [`useAsyncCall()`](https://liaison.dev/docs/v1/reference/react-integration#use-async-call-react-hook) hook to track the loading of the messages. When the messages are being loaded, we return `null`, and if the loading fails we render an error message. Otherwise, we render the loaded messages using their `Viewer()` view.

###### `MessageCreator()` View

The `MessageCreator()` view allows the user to create a new message and save it into the backend.

The `createdMessage` variable is initialized using the [`useRecomputableMemo()`](https://liaison.dev/docs/v1/reference/react-integration#use-recomputable-memo-react-hook) hook, which plays the same role as the React [useMemo()](https://reactjs.org/docs/hooks-reference.html#usememo) hook, but in addition to a memoized value, we get a function that we can call anytime to recompute the memoized value.

The `saveMessage()` callback is simply defined using the React [useCallback()](https://reactjs.org/docs/hooks-reference.html#usecallback) hook, and it is later passed to the `createdMessage`'s `Form()` view so the message can be saved when the user clicks the "Submit" button.

Once the `createdMessage` is saved, we add it to the `existingMessages` so it can be instantly displayed with all other messages.

Lastly, we reset the `createdMessage` by calling `resetCreatedMessage()`.

#### Wrapping Up

We've built a simple web app with a frontend, a backend, and a database. And thanks to Liaison, we were able to free ourselves from several boring tasks that we usually encounter:

- We didn't have to build a web API to connect the frontend and the backend.
- To interact with the database, there was no need to add an ORM or a query builder.
- To build the frontend, we didn't have to bother with a state manager.

If you are a seasoned React developer or a functional programming advocate, you might be a little surprised by the way the frontend was implemented. But please don't judge too quickly, give Liaison a try, and hopefully, you'll see how your projects could be dramatically simplified with the object-oriented approach that Liaison is enabling.
