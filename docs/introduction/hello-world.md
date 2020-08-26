### Hello, World!

Let's start our journey into Liaison by implementing the mandatory ["Hello, World!"](https://en.wikipedia.org/wiki/%22Hello,_World!%22_program) program, and let's make it object-oriented, and full-stack!

> Liaison supports both [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) and [TypeScript](https://www.typescriptlang.org/). To select your language of choice, use the drop-down menu on the left.

#### Creating the Project

First, from your terminal, create a directory for your project, and navigate into it:

```sh
mkdir hello-world
cd hello-world
```

Then, initialize your project with:

```sh
npm init -y
```

#### Setting Up Your Development Environment

<!-- <if language="js"> -->

Since Liaison is using some novel JavaScript features (such as decorators), you need to install [Babel](https://babeljs.io/) to compile the code we're going to write:

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

Then, install the necessary packages to compile and execute the [TypeScript](https://www.typescriptlang.org/) code we're going to write:

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
    "lib": ["ES2018", "DOM"],
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

- A backend in charge of the data model and business logic.
- A frontend in charge of the user interface.

Sure, such an architecture sounds silly for a simple "Hello, World!". But it serves our purpose, which is to introduce the core concepts of Liaison.

So let's start by implementing the backend.

First, install the Liaison's packages we're going to use:

```sh
npm install @liaison/component @liaison/component-http-server
```

We've installed:

- `@liaison/component` that provides the [`Component`](https://liaison.dev/docs/v1/reference/component) class, which can be conceptualized as the basic JavaScript [`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) class, but with superpowers.
- `@liaison/component-http-server` that provides the [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server) class, which allows to serve a `Component` class over HTTP.

Now, let's write some actual code. With your favorite code editor, create a file named <!-- <if language="js"> -->`backend.js`<!-- </if> --><!-- <if language="ts"> -->`backend.ts`<!-- </if> --> in an `src` directory, and write the following code:

```js
import {Component, attribute, method, expose} from '@liaison/component';
import {ComponentHTTPServer} from '@liaison/component-http-server';

export class Greeter extends Component {
  @expose({set: true}) @attribute('string') name = 'World';

  @expose({call: true}) @method() async hello() {
    return `Hello, ${this.name}!`;
  }
}

const server = new ComponentHTTPServer(Greeter, {port: 3210});

server.start();
```

Oh my! All that code just for a simple "Hello, World!"? Sure, it sounds overkill, but we've actually implemented a full-grade backend with a data model, some business logic, and an HTTP server exposing the whole thing.

Let's decompose the code to understand what we've accomplished.

First, we've defined a `Greeter` class that inherits from [`Component`](https://liaison.dev/docs/v1/reference/component). In a nutshell, by inheriting a class from `Component`, you get most of the goodness provided by Liaison, such as attribute type checking, validation, serialization, or remote method invocation.

Our `Greeter` class is composed of two properties:

- The `name` attribute prefixed with the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator. This decorator enables (among other things) to specify the type of values an attribute can store (`'string'` in our case). Notice that the `name` attribute also specifies a default value (`'World'`).
- The `hello()` method prefixed with the [`@method()`](https://liaison.dev/docs/v1/reference/component#method-decorator) decorator.

Both properties are exposed to remote access thanks to the [`@expose()`](https://liaison.dev/docs/v1/reference/component#expose-decorator) decorator:

- The `name` attribute can be remotely set (`{set: true}`).
- The `hello()` method can be remotely called (`{call: true}`).

> Note that you don't need to prefix all your attributes and methods with a decorator. Typically, you only use a decorator when you want to take profit of a Liaison feature.

After the class definition, a [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server) is created and then started with [`server.start()`](https://liaison.dev/docs/v1/reference/component-http-server#start-instance-method).

This is it! Our backend is completed and ready to be executed with:

```sh
// JS

npx babel-node ./src/backend.js
```

```sh
// TS

npx ts-node ./src/backend.ts
```

If nothing happens on the screen, it's all good. The backend is running and waiting for requests.

> Note: If you wish to display a log of what's going on in the backend, you can set some environment variables before starting it:
>
> ```sh
> // JS
>
> DEBUG=liaison:* DEBUG_DEPTH=5 npx babel-node ./src/backend.js
> ```
>
> ```sh
> // TS
>
> DEBUG=liaison:* DEBUG_DEPTH=5 npx ts-node ./src/backend.ts
> ```

#### Implementing the frontend

A typical frontend runs in a browser, but to make this guide easier to grasp, we're going to implement a CLI frontend (i.e., a frontend that runs in the terminal).

First, install `@liaison/component-http-client`, which will allow us to communicate with the backend.

```sh
npm install @liaison/component-http-client
```

Then, create a file named <!-- <if language="js"> -->`frontend.js`<!-- </if> --><!-- <if language="ts"> -->`frontend.ts`<!-- </if> --> in the `src` directory, and write the following code:

```js
// JS

import {ComponentHTTPClient} from '@liaison/component-http-client';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const Greeter = await client.getComponent();

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
```

```ts
// TS

import {ComponentHTTPClient} from '@liaison/component-http-client';

import type {Greeter as GreeterType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const Greeter = (await client.getComponent()) as typeof GreeterType;

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
```

That wasn't too difficult, was it? Well, actually, with these few lines of code, there's quite a lot going on.

First, a [`ComponentHTTPClient`](https://liaison.dev/docs/v1/reference/component-http-client) is created so we can communicate with the [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server) that was created in the backend.

Then, the [`getComponent()`](https://liaison.dev/docs/v1/reference/component-http-client#get-component-instance-method) method is called to get the `Greeter` class from the backend. Well, sort of. In reality, what we are getting is a proxy to the `Greeter` class that is running in the backend. All the exposed attributes of the backend's `Greeter` class become available from the frontend (with their types, validators, default values, etc.), and all the backend's exposed methods are callable from the frontend.

<!-- <if language="ts"> -->

Since we are using TypeScript, we want to make the frontend's `Greeter` class fully aware of its type. We could have repeated the class definition in the frontend, but a better way is to import the backend's `Greeter` class type, and cast the frontend's `Greeter` class to this same type (using the `as typeof GreeterType` expression). Note that only the type is imported from the backend (thanks to the `import type` statement), so the implementation remains totally unknown for the frontend.

<!-- </if> -->

Once we have the `Greeter` class in the frontend, we can use it like any JavaScript class. So an instance of it is created with `new Greeter({name: 'Steve'})`. Note that a value for the `name` attribute is specified, but we could not specify anything, in which case the default value (`'World'`) would be used.

Finally, the `hello()` method is called, and this is where all the magic happens. Although the method is implemented and executed in the backend, we can call it from the frontend as if it were a regular JavaScript method. In our case, the `hello()` method has no parameters, but if it did, they would be automatically transported to the backend. Even better, the instance's attributes that are set in the frontend (`movie.name` in our case) are transported to the backend as well.

It's about time to run the frontend. While keeping the backend running, invoke the following command in a new terminal:

```sh
// JS

npx babel-node ./src/frontend.js
```

```sh
// TS

npx ts-node ./src/frontend.ts
```

As expected, the following is printed on the screen:

```sh
Hello, Steve!
```

Let's add a bit of fun by extending the `Greeter` class in the frontend.

Modify the <!-- <if language="js"> -->`frontend.js`<!-- </if> --><!-- <if language="ts"> -->`frontend.ts`<!-- </if> --> file as follows:

```js
// JS

import {ComponentHTTPClient} from '@liaison/component-http-client';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const BackendGreeter = await client.getComponent();

  class Greeter extends BackendGreeter {
    async hello() {
      return (await super.hello()).toUpperCase();
    }
  }

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
```

```ts
// TS

import {ComponentHTTPClient} from '@liaison/component-http-client';

import type {Greeter as GreeterType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const BackendGreeter = (await client.getComponent()) as typeof GreeterType;

  class Greeter extends BackendGreeter {
    async hello() {
      return (await super.hello()).toUpperCase();
    }
  }

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
```

As mentioned before a class proxy (`BackendGreeter`) behaves like a regular class, and it is totally fine to extend it. So the frontend's `hello()` method can be overridden to transform the result of the backend's `hello()` method, which is simply called with `super.hello()`.

If you run the frontend again, you should now get the following output:

```sh
HELLO, STEVE!
```

Liaison brings what we like to call a "cross-layer class inheritance" ability. Instead of seeing the frontend and the backend as two separate worlds, you can see them as one unified world. Naturally, they remain _physically_ separated. They run in two different execution environments. But _logically_, they are one thing, and that changes the game completely.
