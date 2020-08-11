### Hello, World!

Let's start our journey into Liaison by implementing the mandatory ["Hello, World!"](https://en.wikipedia.org/wiki/%22Hello,_World!%22_program) program, and let's make it object-oriented and full-stack!

> Liaison supports both [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) and [TypeScript](https://www.typescriptlang.org/). To select your language of choice, use the drop-down menu on the left.

#### Setting Up Your Development Environment

First, from your terminal, create a directory for your project, and navigate into it:

```sh
mkdir hello-world
cd hello-world
```

Then, initialize your project with:

```sh
npm init -y
```

<!-- <if language="js"> -->

Since Liaison is using some novel JavaScript features (such as decorators), you need to install [Babel](https://babeljs.io/) to compile the code we are going to write:

```sh
npm install --save-dev @babel/core @babel/node @babel/preset-env \
  @babel/plugin-proposal-class-properties @babel/plugin-proposal-decorators
```

> Note that we've installed [`@babel/node`](https://babeljs.io/docs/en/babel-node) to simplify the development workflow. When deploying to production, instead of using `@babel/node`, you'd better compile your code in a build step so it can be directly executed with [Node.js](https://nodejs.org/).

Finally, configure Babel by creating a `babel.config.json` file with the following content:

```json
{
  "presets": [["@babel/preset-env", {"targets": {"node": "10"}}]],
  "plugins": [
    ["@babel/plugin-proposal-decorators", {"legacy": true}],
    ["@babel/plugin-proposal-class-properties"]
  ]
}
```

<!-- </if> -->

<!-- <if language="ts"> -->

Then, install the necessary packages to compile and execute the [TypeScript](https://www.typescriptlang.org/) code we are going to write:

```sh
npm install --save-dev typescript ts-node
```

> Note that we've installed [`ts-node`](https://www.npmjs.com/package/ts-node) to simplify the development workflow. When deploying to production, instead of using `ts-node`, you'd better compile your code in a build step so it can be directly executed with [Node.js](https://nodejs.org/).

Finally, configure TypeScript by creating a `tsconfig.json` file with the following content:

```json
{
  "include": ["src/**/*"],
  "compilerOptions": {
    "target": "ES2018",
    "module": "CommonJS",
    "lib": ["ES2018"],
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

#### Implementing the Backend

Our full-stack "Hello, World!" will be composed of two parts:

- A backend for implementing the "business logic".
- A frontend for implementing the "user interface".

Sure, such an architecture is silly for a simple "Hello, World!", but it serves our purpose, which is to illustrate the fundamental concepts of Liaison.

So let's start by implementing the backend.

First, install the Liaison's packages we're going to use:

```sh
npm install @liaison/component @liaison/component-http-server
```

You've installed:

- `@liaison/component` that provides the [`Component`](https://liaison.dev/docs/v1/reference/component) class, which can be conceptualized as the basic JavaScript [`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) class, but with super powers.
- `@liaison/component-http-server` that provides the [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server) class, which allows to serve a `Component` class over HTTP.

Now, let's write some actual code! With your favorite code editor, create a file named <!-- <if language="js"> -->`backend.js`<!-- </if> --><!-- <if language="ts"> -->`backend.ts`<!-- </if> --> in a `src` directory, and write the following code:

```js
import {Component, attribute, method, expose} from '@liaison/component';
import {ComponentHTTPServer} from '@liaison/component-http-server';

export class Greeter extends Component {
  @expose({set: true}) @attribute('string') name = 'World';

  @expose({call: true}) @method() hello() {
    return `Hello, ${this.name}!`;
  }
}

const server = new ComponentHTTPServer(Greeter, {port: 3210});

server.start();
```

Oh my! All that code just for a simple "Hello, World!"? Sure, it sounds an overkill, but we have actually implemented a full-grade backend with a data model, some business logic, and an HTTP server exposing the whole thing.

Let's decompose the code to understand what we have accomplished.

First, we've defined a `Greeter` class that inherits from [`Component`](https://liaison.dev/docs/v1/reference/component). In a nutshell, by inheriting a class from `Component`, you get most of the goodness provided by Liaison, such as attribute type checking, validation, serialization, or remote method invocation.

Our `Greeter` class is composed of two properties:

- The `name` attribute prefixed with the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator. This decorator enables (among other things) to specify the type of values an attribute can store (`'string'` in our case).
- The `hello()` method prefixed with the [`@method()`](https://liaison.dev/docs/v1/reference/component#method-decorator) decorator.

Both properties are exposed to remote access thanks to the [`@expose()`](https://liaison.dev/docs/v1/reference/component#expose-decorator) decorator:

- The `name` attribute can be remotely set (`{set: true}`).
- The `hello()` method can be remotely called (`{call: true}`).

> Note that you don't need to prefix all your attributes and methods with a decorator. Typically, you only use a decorator when you want to take profit of a Liaison feature.

After the class definition, a [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server) is instantiated, and then started with `server.start()`.

This is it! Our backend is completed and ready to be executed with:

```bash
// JS

npx babel-node ./src/backend.js
```

```bash
// TS

npx ts-node ./src/backend.ts
```

If nothing happens on the screen, it's all good. The server is running and waiting for requests.

> Note: If you wish to display a log of what's going on in the server, your can set some environment variables before starting the backend:
>
> ```bash
> // JS
>
> DEBUG=liaison:* DEBUG_DEPTH=5 npx babel-node ./src/backend.js
> ```
>
> ```bash
> // TS
>
> DEBUG=liaison:* DEBUG_DEPTH=5 npx ts-node ./src/backend.ts
> ```
