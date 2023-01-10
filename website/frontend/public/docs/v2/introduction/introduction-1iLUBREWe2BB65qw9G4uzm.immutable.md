### Introduction

> **Note**: Layr v2 is published on NPM, but the documentation is still a work in progress.

#### Overview

Layr is a set of JavaScript/TypeScript libraries that dramatically simplify the development of highly dynamic full-stack apps.

Typically, a highly dynamic full-stack app comprises a frontend and a backend running in two different environments connected through a web API (REST, GraphQL, etc.)

Separating the frontend and the backend is a good thing. Still, the problem is that building a web API usually leads to a lot of code scattering, knowledge duplication, boilerplate, and accidental complexity.

Layr removes the need to build a web API and [reunites the frontend and backend](https://dev.to/mvila/good-bye-web-apis-2bel) so that you can experience them as a single entity.

On the frontend side, Layr gives you [routing capabilities](https://layrjs.com/docs/v2/reference/routable) and [object observability](https://layrjs.com/docs/v2/reference/observable) so that you don't need to add an external router or a state manager.

On the backend side, Layr offers an [ORM](https://layrjs.com/docs/v2/reference/storable) (which can be exposed to the frontend) to make data storage as easy as possible.

#### Made for Highly Dynamic Apps

Layr stands out for building apps that offer rich user interfaces, such as the good old desktop apps.

Even if they both run in a browser, we should clearly differentiate "websites" and "web apps".

##### Websites

Websites provide fast load time, good [SEO](https://en.wikipedia.org/wiki/Search_engine_optimization), and a few dynamic parts.

Some examples fitting in this category are e-commerce websites (e.g., [Amazon](https://www.amazon.com/)), marketplace platforms (e.g., [Airbnb](https://www.airbnb.com/)), or online newspapers (e.g., [The New York Times](https://www.nytimes.com/)).

Layr is inappropriate for building these kinds of websites because it relies on a [Single-page application](https://en.wikipedia.org/wiki/Single-page_application) architecture and doesn't provide server-side rendering.

So, instead of Layr, you should use some frameworks such as [Next.js](https://nextjs.org/), [Nuxt.js](https://nextjs.org/), or [Remix](https://remix.run/).

##### Web Apps

Web apps provide rich user interfaces and are all made of dynamic parts.

Some examples fitting in this category are productivity apps (e.g., [Notion](https://www.notion.so/)), communication apps (e.g., [Slack](https://slack.com/)), or design apps (e.g., [Figma](https://www.figma.com/)).

Layr is made for building these kinds of apps with a straightforward architecture:

- The frontend exposes an interface for _humans_.
- The backend exposes an interface for _computers_.

Note that the frontend can obviously run in a browser, but it can also run on mobile and desktop with the help of frameworks such as [React Native](https://reactnative.dev/) or [Electron](https://www.electronjs.org/).

#### Core Features

Layr provides everything you need to build an app from start to finish:

- **Cross-layer inheritance**: A frontend class can "inherit" from a backend class, so some exposed [attributes](https://layrjs.com/docs/v2/reference/attribute) are automatically transported between the frontend and the backend. Also, you can call some exposed backend [methods](https://layrjs.com/docs/v2/reference/method) directly from the frontend.
- **Controlled attributes**: An attribute can be [type-checked](https://layrjs.com/docs/v2/reference/value-type), [sanitized](https://layrjs.com/docs/v2/reference/sanitizer), [validated](https://layrjs.com/docs/v2/reference/validator), [serialized](https://layrjs.com/docs/v2/reference/component#serialization), and [observed](https://layrjs.com/docs/v2/reference/observable) at runtime.
- **Storage**: A class instance can be [persisted](https://layrjs.com/docs/v2/reference/storable) in a database. Currently, only [MongoDB](https://www.mongodb.com/) is supported, but we plan to support more databases in the future.
- **Routing**: A method can be [associated with an URL](https://layrjs.com/docs/v2/reference/routable) and controlled by a [navigator](https://layrjs.com/docs/v2/reference/navigator) so that this method is automatically called when the user navigates.
- **Layouts**: A method can act as a [wrapper](https://layrjs.com/docs/v2/reference/wrapper) for other methods with a shared URL path prefix. This way, you can easily create [layouts](https://layrjs.com/docs/v2/reference/react-integration#layout-decorator) for your [pages](https://layrjs.com/docs/v2/reference/react-integration#page-decorator).
- **Authorization**: [User-role-based](https://layrjs.com/docs/v2/reference/with-roles) authorizations can be set to restrict some attributes or methods.
- **Integrations**: Integration helpers are provided to facilitate the integration of the most popular libraries or services. Currently, two integration helpers are available: [react-integration](https://layrjs.com/docs/v2/reference/react-integration) and [aws-integration](https://layrjs.com/docs/v2/reference/aws-integration). But more should come shortly.
- **Interoperability**: The backend is automatically exposed through a [Deepr API](https://deepr.io), so you can consume it from any frontend even though it's not built with Layr. And if you want to bring a more standard API (e.g., REST) to your backend, it's straightforward to add such an API in your Layr backend.

#### Core Principles

Here's a quick taste of the core principles upon which Layr is built:

- **Object-oriented**: Layr embraces the object-oriented paradigm in all aspects of an app and allows you to organize your code in a way that is as cohesive as possible.
- **End-to-end type safety**: When you use TypeScript, from the frontend to the database (which goes through the backend), every single piece of a Layr app can be type-safe.
- **100% DRY**: A Layr app can be fully [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) (i.e., zero knowledge duplication).
- **Low-level**: Layr is designed to be as closest to the language as possible and can be seen as a [language extension](https://layrjs.com/blog/articles/Getting-the-Right-Level-of-Generalization-7xpk37) in many ways.
- **Unopinionated**: Layr has strong opinions about itself but doesn't force you to use any external library, service, or tool.

#### Command-Line Interface

Layr is just a set of low-level JavaScript/TypeScript libraries and does not come with a CLI.

So, you can use Layr with any development and deployment tools.

However, we know that setting up a development environment and a deployment mechanism can be challenging.

So, we created [Boostr](https://boostr.dev), a companion tool that takes care of everything you need to build and deploy a Layr app.

Check out the [Boostr documentation](https://boostr.dev/docs) to find out more.

#### Compatibility

Layr is implemented in [TypeScript](https://www.typescriptlang.org/), but you can use either JavaScript or TypeScript to build your app.

If you are using JavaScript, you'll need to compile your code with [Babel](https://babeljs.io/) to take advantage of some novel JavaScript features such as "decorators".

If you are using TypeScript, all you need is the TypeScript compiler ([`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html)).

> **Note**: If you use [Boostr](https://boostr.dev) to manage your app's development and deployment, you don't have to worry about compiling your code because it is automatically handled.

To run your app, you'll need a JavaScript runtime for both the frontend and the backend.

##### Frontend

###### Web

Any modern browser should work fine.

Here are the minimum versions with which Layr is tested:

- Chrome v55
- Safari v11
- Firefox v54
- Edge Chromium

###### Mobile and Desktop

Any mobile or desktop app framework using JavaScript or TypeScript (such as [React Native](https://reactnative.dev/) or [Electron](https://www.electronjs.org/)) should work fine.

##### Backend

Any environment running [Node.js](https://nodejs.org/) v16 or later is supported.

#### Examples

Here are some examples of simple full-stack apps that you can check out:

- [CRUD Example App (JS)](https://github.com/layrjs/crud-example-app-js-boostr)
- [CRUD Example App (TS)](https://github.com/layrjs/crud-example-app-ts-boostr)
- [Layr Website (TS)](https://github.com/layrjs/layr/tree/master/website)
- [CodebaseShow (TS)](https://github.com/codebaseshow/codebaseshow)
- [RealWorld Example App (JS)](https://github.com/layrjs/react-layr-realworld-example-app)
