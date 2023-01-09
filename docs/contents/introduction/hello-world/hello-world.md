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

Boostr is a companion tool for Layr that takes care of everything you need to build and deploy a Layr app so you can focus on what really matters — the app's code.

So, first of all, we have to install Boostr. Run the following command in your terminal:

```sh
npm install --global boostr
```

> **Notes**:
>
> - Depending on your Node.js installation, you may have to prefix the command with `sudo` so the package can be installed globally.
> - Installing an NPM package globally is usually not recommended. But it's not a problem in this case because each app managed by Boostr uses a local Boostr package which is automatically installed. So the global Boostr package can be seen as a shortcut to the local Boostr packages installed in your apps, and, therefore, you can have different apps using different versions of Boostr.

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

We will not detail all directories and files created by Boostr because it would be out of the scope of this tutorial. If you are the kind of person who needs to understand everything, please check out the [Boostr documentation](https://boostr.dev/docs) to find out more.

So, we will only focus on two files:

<!-- <if language="js"> -->

- `frontend/src/components/application.jsx`: The root [component](https://layrjs.com/docs/v2/reference/component) of the app frontend.
- `backend/src/components/application.js`: The root [component](https://layrjs.com/docs/v2/reference/component) of the app backend.

<!-- </if> -->

<!-- <if language="ts"> -->

- `frontend/src/components/application.tsx`: The root [component](https://layrjs.com/docs/v2/reference/component) of the app frontend.
- `backend/src/components/application.ts`: The root [component](https://layrjs.com/docs/v2/reference/component) of the app backend.

<!-- </if> -->

#### Starting the App

Start the app in development mode with the following command:

```sh
boostr start
```

The terminal should output something like this:

```txt
[database] MongoDB server started at mongodb://localhost:18160/
[backend] Build succeeded (bundle size: 2.06MB)
[backend] Component HTTP server started at http://localhost:18159/
[frontend] Build succeeded (bundle size: 1.34MB)
[frontend] Single-page application server started at http://localhost:18158/
```

> **Notes**:
>
> - The TCP ports used for each [local development URL](https://boostr.dev/docs#local-development-urls) were randomly set when the Boostr `initialize` command was executed to create the app in the [previous section](https://layrjs.com/docs/v2/introduction/hello-world#creating-the-app). So, it's normal if the TCP ports are different for you.
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

Here's what the initial frontend root [component](https://layrjs.com/docs/v2/reference/component) (`Application`) looks like:

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

If we put aside the [mixin mechanism](https://www.typescriptlang.org/docs/handbook/mixins.html) that allows the frontend `Application` component to "inherit" from the backend `Application` component, we can see three class methods.

`MainLayout()` implements a layout for all the pages of the app:

- It is decorated with [`@layout('/')`](https://layrjs.com/docs/v2/reference/react-integration#layout-decorator), which makes the method acts as a layout and defines an URL path (`'/'`) for it.
- It renders the name of the app (using the `APPLICATION_NAME` [environment variable](https://github.com/boostrjs/boostr#environment-variables)) in an `<h1>` HTML tag, which is nested into a link pointing to the app's main page (using the [`<this.MainPage.Link>`](https://layrjs.com/docs/v2/reference/routable#route-decorator) React element).
- It calls the `children` prop to render the content of the pages using this layout.

`MainPage()` implements the main page of the app:

- It is decorated with [`@page('[/]')`](https://layrjs.com/docs/v2/reference/react-integration#page-decorator), which makes the method acts as a page associated with the `'/'` URL path and specifies that the main layout (`'/'` enclosed in square brackets `'[]'`) should be used.
- It returns the result of the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) React hook, which calls a backend method (with `await this.isHealthy()`) and renders its result (with `<p>The app is {isHealthy ? 'healthy' : 'unhealthy'}.</p>`).

`NotFoundPage()` implements a page that is displayed when a user goes to an URL that is not handled by the app:

- It is decorated with [`@page('[/]*')`](https://layrjs.com/docs/v2/reference/react-integration#page-decorator), which makes the method acts as a page associated with any unhandled URL path starting with `'/'` and specifies that the main layout (`'/'` enclosed in square brackets `'[]'`) should be used.
- It renders some simple HTML tags and texts indicating that the page cannot be found.

##### Backend

Here's what the initial backend root [component](https://layrjs.com/docs/v2/reference/component) (`Application`) looks like:

```js
// JS

// backend/src/components/application.js

import {Component, method, expose} from '@layr/component';

export class Application extends Component {
  @expose({call: true}) @method() static async isHealthy() {
    return true;
  }
}
```

```ts
// TS

// backend/src/components/application.ts

import {Component, method, expose} from '@layr/component';

export class Application extends Component {
  @expose({call: true}) @method() static async isHealthy() {
    return true;
  }
}
```

This component is straightforward.

`isHealthy()` implements a class method that the frontend can call to check whether the app is healthy:

- It is decorated with [`@expose({call: true})`](https://layrjs.com/docs/v2/reference/component#expose-decorator), which exposes the method to the frontend.
- It is also decorated with [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator), which is required so that the `@expose()` decorator can be used.
- It always returns `true`, which is rather pointless. An actual `isHealthy()` method would, for example, check whether a database responds correctly.

#### Displaying "Hello, World!" in the Frontend

It's about time to write some code.

We'll start gently by modifying the frontend to display "Hello, World!" instead of "The app is healthy.".

Modify the `MainPage()` class method in the <!-- <if language="js"> -->`frontend/src/components/application.jsx`<!-- </if> --><!-- <if language="ts"> -->`frontend/src/components/application.tsx`<!-- </if> --> file as follows:

```ts
@page('[/]') static MainPage() {
  return <p>Hello, World!</p>;
}
```

Save the file, and your browser should automatically refresh the page with the following contents:

<p>
	<img src="https://layrjs.com/docs/v2/introduction/hello-world/assets/screenshot-002.immutable.png" alt="Screenshot of the app displaying 'Hello, World!'" style="width: 100%; margin-top: .5rem">
</p>

#### Adding a Page in the Frontend

So the frontend is now displaying "Hello, World!" and we could call it a day.

But that was a bit too easy, don't you think?

Let's spice this tutorial a little by adding a page in charge of displaying the "Hello, World!" message.

Add the following class method in the <!-- <if language="js"> -->`frontend/src/components/application.jsx`<!-- </if> --><!-- <if language="ts"> -->`frontend/src/components/application.tsx`<!-- </if> --> file:

```ts
@page('[/]hello-world') static HelloWorldPage() {
  return <p>Hello, World!</p>;
}
```

That's it. The app just got a new page. You could view it by changing the URL path to `/hello-world` in your browser, but adding a link to the new page inside the main page would be better in terms of user experience.

Let's do so by modifying the `MainPage()` class method as follows:

```ts
@page('[/]') static MainPage() {
  return (
    <p>
      <this.HelloWorldPage.Link>
        See the "Hello, World!" page
      </this.HelloWorldPage.Link>
    </p>
  );
}
```

Hold on. What's going on here? Is it how we create links with Layr? Where is the URL path (`'/hello-world'`) of the "Hello, World!" page? Well, in a Layr app, except in the `@page()` decorators, you should never encounter any URL path.

We hope it doesn't sound too magical because it is not. Any method decorated with [`@page()`](https://layrjs.com/docs/v2/reference/react-integration#page-decorator) automatically gets some attached [shortcut functions](https://layrjs.com/docs/v2/reference/routable#route-decorator), such as `Link()`, which implements a React component rendering a `<a>` tag referencing the URL path of the page.

Your browser should now display the following page:

<p>
	<img src="https://layrjs.com/docs/v2/introduction/hello-world/assets/screenshot-003.immutable.png" alt="Screenshot of the app displaying a link to the 'Hello, World!' page" style="width: 100%; margin-top: .5rem">
</p>

#### Getting the "Hello, World" Message from the Backend

At the beginning of this tutorial, we promised to create a full-stack app, but currently, the backend is not involved, and everything happens in the frontend.

Let's fix that by moving the "business logic" generating the "Hello, World!" message to the backend.

First, add the following class method in the <!-- <if language="js"> -->`backend/src/components/application.js`<!-- </if> --><!-- <if language="ts"> -->`backend/src/components/application.ts`<!-- </if> --> file:

```ts
@expose({call: true}) @method() static async getHelloWorld() {
  return 'Hello, World!';
}
```

This method will be callable from the frontend (thanks to the [`@expose()`](https://layrjs.com/docs/v2/reference/component#expose-decorator) and [`@method()`](https://layrjs.com/docs/v2/reference/component#method-decorator) decorators) and will return the `'Hello, World!'` string.

> **Note**: Since the `isHealthy()` class method is not used anymore, you can remove it if you want.

Save the file to restart the backend, and then modify the `HelloWorldPage()` class method in the <!-- <if language="js"> -->`frontend/src/components/application.jsx`<!-- </if> --><!-- <if language="ts"> -->`frontend/src/components/application.tsx`<!-- </if> --> file as follows:

```ts
@page('[/]hello-world') static HelloWorldPage() {
  return useData(
    async () => await this.getHelloWorld(),

    (helloWorld) => <p>{helloWorld}</p>
  );
}
```

As seen in the initial [`MainPage()`](https://layrjs.com/docs/v2/introduction/hello-world#frontend) method, we use the [`useData()`](https://layrjs.com/docs/v2/reference/react-integration#use-data-react-hook) React hook to call a backend method (with `await this.getHelloWorld()`) and render its result (with `<p>{helloWorld}</p>`).

If you refresh the "Hello, World!" page in your browser, you should not see any difference. However, if you inspect the network requests via the browser's developer tools, you should see that the `'Hello, World'` string displayed in the frontend comes from the backend.

#### One Last Thing

Technically, we now have a full-stack app involving a frontend and a backend.

But the app is a bit static. The backend always returns the same `'Hello, World'` string, which is rather boring.

Let's make the app more dynamic by modifying the `getHelloWorld()` class method in the <!-- <if language="js"> -->`backend/src/components/application.js`<!-- </if> --><!-- <if language="ts"> -->`backend/src/components/application.ts`<!-- </if> --> file as follows:

```ts
@expose({call: true}) @method() static async getHelloWorld() {
  const translations = ['Hello, World!', 'Bonjour le monde !', 'こんにちは世界！'];

  const translation = translations[Math.round(Math.random() * (translations.length - 1))];

  return translation;
}
```

Save the file to restart the backend, and now, when you refresh the "Hello, World!" page several times in your browser, you should see some translations randomly picked up.

Here's an example showing the Japanese translation:

<p>
	<img src="https://layrjs.com/docs/v2/introduction/hello-world/assets/screenshot-004.immutable.png" alt="Screenshot of the app displaying 'Hello, World!' in Japanese" style="width: 100%; margin-top: .5rem">
</p>

We hardcoded the translations in the `getHelloWorld()` class method, which is OK for this tutorial. But in a real-world app, storing the translations in a database would be better so an admin can edit them. We'll see how to achieve that in [another tutorial](https://layrjs.com/docs/v2/introduction/storing-data) that remains to be written.

#### Wrapping Up

In this first tutorial, we saw how to build a basic full-stack app with Layr:

- We [created an app](https://layrjs.com/docs/v2/introduction/hello-world#creating-the-app) and [started it](https://layrjs.com/docs/v2/introduction/hello-world#starting-the-app) in development mode with a few [Boostr](https://boostr.dev) commands.
- We discovered how to implement [layouts](https://layrjs.com/docs/v2/introduction/hello-world#taking-a-look-at-the-initial-app), [pages](https://layrjs.com/docs/v2/introduction/hello-world#adding-a-page-in-the-frontend), and [links](https://layrjs.com/docs/v2/introduction/hello-world#adding-a-page-in-the-frontend) encapsulated in a Layr [component](https://layrjs.com/docs/v2/reference/component).
- We found out how [a backend method could be called from the frontend](https://layrjs.com/docs/v2/introduction/hello-world#getting-the-hello-world-message-from-the-backend) thanks to the cross-layer class inheritance ability of Layr.
