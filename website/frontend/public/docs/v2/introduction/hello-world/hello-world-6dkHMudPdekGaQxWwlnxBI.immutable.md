### Hello, World!

Let's start our journey into Layr by implementing the mandatory ["Hello, World!"](https://en.wikipedia.org/wiki/%22Hello,_World!%22_program) app, and let's make it object-oriented and full-stack!

> **Note**: Layr supports both [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) and [TypeScript](https://www.typescriptlang.org/). To select your language of choice, use the drop-down menu on the left.

> **TLDR**: The completed app is available in the <!-- <if language="js"> -->[Layr repository](https://github.com/layrjs/layr/tree/master/examples/v2/hello-world-js)<!-- </if> --><!-- <if language="ts"> -->[Layr repository](https://github.com/layrjs/layr/tree/master/examples/v2/hello-world-ts)<!-- </if> -->.

#### Prerequisites

- You use a Mac with a recent version of macOS. Everything should work fine on Linux, but we haven't tested it yet. It may work on Windows, but we haven't tested it and don't plan to provide support for now.
- You have [Node.js](https://nodejs.org/) v16 or newer installed.
- You are familiar with [React](https://reactjs.org/), which is used in this tutorial.

#### Creating the App

To make things easier, we'll use [Boostr](https://boostr.dev) to create the app and manage the local development environment.

Boostr is a companion tool for Layr that takes care of everything we need to build and deploy a Layr app so we can focus on what really matters — the app's code.

So, first of all, we need to install Boostr. To do so, run the following command in your terminal:

```sh
npm install --global boostr
```

> **Note**: Installing an NPM package globally is usually not recommended. But it's not a problem in this case because each app managed by Boostr uses a local Boostr package which is automatically installed. So the global Boostr package can be seen as a shortcut to the local Boostr packages installed in your apps, and, therefore, you can have different apps using different versions of Boostr.

Then, run the following commands to create a directory for the app and initialize it:

<!-- <if language="js"> -->

```sh
mkdir hello-world
cd hello-world
boostr initialize @boostr/web-app-js
```

<!-- </if> -->

<!-- <if language="ts"> -->

```sh
mkdir hello-world
cd hello-world
boostr initialize @boostr/web-app-ts
```

<!-- </if> -->

Finally, you can open the `hello-world` directory in your favorite [IDE](https://en.wikipedia.org/wiki/Integrated_development_environment) to explore the initial codebase.

> **Note**: You can use any IDE you want, but if you use [Visual Studio Code](https://code.visualstudio.com/), you can profit from the VS Code configuration included in the [Boostr app templates](https://boostr.dev/docs#boostr-initialize-template-options). Otherwise, you may have to set up your IDE to get a suitable configuration.

We will not detail all directories and files created by Boostr because it would be out of the scope of this tutorial. If you are the kind of person that needs to understand everything, please check out the [Boostr documentation](https://boostr.dev/docs) to find out more.

So, we will only focus on two files:

<!-- <if language="js"> -->

- `frontend/src/components/application.jsx`: The root component of the app frontend.
- `backend/src/components/application.js`: The root component of the app backend.

<!-- </if> -->

<!-- <if language="ts"> -->

- `frontend/src/components/application.tsx`: The root component of the app frontend.
- `backend/src/components/application.ts`: The root component of the app backend.

<!-- </if> -->

#### Starting the App

Start the app in development mode with the following command:

```sh
boostr start
```

The terminal should output something like this:

```
[database] MongoDB server started at mongodb://localhost:18160/
[backend] Build succeeded (bundle size: 2.06MB)
[backend] Component HTTP server started at http://localhost:18159/
[frontend] Build succeeded (bundle size: 1.34MB)
[frontend] Single-page application server started at http://localhost:18158/
```

> **Notes**:
>
> - The TCP ports used for each [local development URL](https://boostr.dev/docs#local-development-urls) were randomly set when the Boostr `initialize` command was executed to create the app in the [previous section](https://layrjs.com/docs/v2/introduction/hello-world#creating-the-app). So, it's normal if they are different for you.
> - Don't be freaked out by the size of the generated bundles in development mode. When you deploy your apps, the generated bundles are a lot smaller.

The last line in the terminal output should include an URL you can open in a browser to display the app.

At this point, you should see something like this in your browser:

<p>
	<img src="https://layrjs.com/docs/v2/introduction/hello-world/assets/screenshot-001.immutable.png" alt="Screenshot of the app initialized by Boostr" style="width: 100%; margin-top: .5rem">
</p>

#### Taking a Look at the Initial App

Let's see what we have for now.

When we bootstrapped the app with the Boostr `initialize` command, we got a minimal app which does one thing: displaying the result of a backend method in the frontend.

##### Frontend

Here's what the initial frontend root component (`Application`) looks like:

```js
// JS

// frontend/src/components/application.jsx

import {Routable} from '@layr/routable';
import React from 'react';
import {layout, page, useData} from '@layr/react-integration';

export const extendApplication = (Base) => {
  class Application extends Routable(Base) {
    @layout('/') static MainLayout({children}) {
      return (
        <>
          <this.MainPage.Link>
            <h1>{process.env.APPLICATION_NAME}</h1>
          </this.MainPage.Link>
          {children()}
        </>
      );
    }

    @page('[/]') static MainPage() {
      return useData(
        async () => await this.isHealthy(),

        (isHealthy) => <p>The app is {isHealthy ? 'healthy' : 'unhealthy'}.</p>
      );
    }

    @page('[/]*') static NotFoundPage() {
      return (
        <>
          <h2>Page not found</h2>
          <p>Sorry, there is nothing here.</p>
        </>
      );
    }
  }

  return Application;
};
```

```ts
// TS

// frontend/src/components/application.tsx

import {Routable} from '@layr/routable';
import React, {Fragment} from 'react';
import {layout, page, useData} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';

export const extendApplication = (Base: typeof BackendApplication) => {
  class Application extends Routable(Base) {
    declare ['constructor']: typeof Application;

    @layout('/') static MainLayout({children}: {children: () => any}) {
      return (
        <>
          <this.MainPage.Link>
            <h1>{process.env.APPLICATION_NAME}</h1>
          </this.MainPage.Link>
          {children()}
        </>
      );
    }

    @page('[/]') static MainPage() {
      return useData(
        async () => await this.isHealthy(),

        (isHealthy) => <p>The app is {isHealthy ? 'healthy' : 'unhealthy'}.</p>
      );
    }

    @page('[/]*') static NotFoundPage() {
      return (
        <>
          <h2>Page not found</h2>
          <p>Sorry, there is nothing here.</p>
        </>
      );
    }
  }

  return Application;
};

export declare const Application: ReturnType<typeof extendApplication>;

export type Application = InstanceType<typeof Application>;
```

If we put aside the [mixin mechanism](https://www.typescriptlang.org/docs/handbook/mixins.html) that allows the frontend `Application` class to inherit from the backend `Application` class, we can see three class methods.

`MainLayout()` implements a layout for all the pages of the app:

- It is decorated with [`@layout('/')`](https://layrjs.com/docs/v2/reference/react-integration#layout-decorator), which makes the method acts as a layout and defines a path (`'/'`) for it.
- It renders the name of the app (using the `APPLICATION_NAME` [environment variable](https://github.com/boostrjs/boostr#environment-variables)) in an `<h1>` HTML tag, which is nested into a link pointing to the app's main page (using the [`<this.MainPage.Link>`](https://layrjs.com/docs/v2/reference/routable#route-decorator) React element).
- It calls the `children` prop to render the content of the pages using this layout.

`MainPage()` implements the main page of the app:

- It is decorated with [`@page('[/]')`](https://layrjs.com/docs/v2/reference/react-integration#page-decorator), which makes the method acts as a page associated with the `'/'` URL path and specifies that the main layout (`'/'` encapsulated into square brackets `'[]'`) should be used.
- It returns the result of the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) React hook, which calls a backend method (with `await this.isHealthy()`) and renders its result (with `<p>The app is {isHealthy ? 'healthy' : 'unhealthy'}.</p>`).

`NotFoundPage()` implements a page that is displayed when a user goes to an URL that is not handled by the app:

- It is decorated with [`@page('[/]*')`](https://layrjs.com/docs/v2/reference/react-integration#page-decorator), which makes the method acts as a page associated with any unhandled URL path starting with `'/'` and specifies that the main layout (`'/'` encapsulated into square brackets `'[]'`) should be used.
- It renders some simple HTML tags expressing that the page could not be found.

##### Backend

```
WIP
```
