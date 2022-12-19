### Introduction

Layr is a set of JavaScript/TypeScript libraries that dramatically simplify the development of full-stack apps.

Typically, a full-stack app comprises a frontend and a backend running in two different environments connected through a web API (REST, GraphQL, etc.)

Separating the frontend and the backend is a good thing. Still, the problem is that building a web API usually leads to a lot of code scattering, duplication of knowledge, boilerplate, and accidental complexity.

Layr removes the need to build a web API and [reunites](https://dev.to/mvila/good-bye-web-apis-2bel) the frontend and the backend in a way that you can experience them as a single entity.

On the frontend side, Layr gives you [routing capabilities](https://layrjs.com/docs/v2/reference/routable) and [object observability](https://layrjs.com/docs/v2/reference/observable) so that in most cases you don't need to add an external router or a state manager.

Lastly, Layr offers an [ORM](https://layrjs.com/docs/v2/reference/storable) to make data storage as easy as possible.

#### Core Features

Layr provides everything you need to build a full-stack app from start to finish:

- **Cross-layer inheritance:** a frontend class can "inherit" from a backend class so that some [attributes](https://layrjs.com/docs/v2/reference/attribute) are transported between the frontend and the backend automatically, and you can call some backend [methods](https://layrjs.com/docs/v2/reference/method) from the frontend directly.
- **Controlled attributes:** an attribute can be [type-checked](https://layrjs.com/docs/v2/reference/value-type) at runtime, [sanitized](https://layrjs.com/docs/v2/reference/sanitizer), [validated](https://layrjs.com/docs/v2/reference/validator), [serialized](https://layrjs.com/docs/v2/reference/component#serialization), and [observed](https://layrjs.com/docs/v2/reference/observable).
- **Remote method invocation:** a backend method can be [exposed](https://layrjs.com/docs/v2/reference/component#expose-decorator) so that the frontend can call it without the need to build a web API.
- **Storage:** a class instance can be [persisted](https://layrjs.com/docs/v2/reference/storable) in a database. Currently, only [MongoDB](https://www.mongodb.com/) is supported, but we plan to support more databases in the future.
- **Routing:** a method can be [associated with an URL](https://layrjs.com/docs/v2/reference/routable) and controlled by a [navigator](https://layrjs.com/docs/v2/reference/navigator) so that this method is automatically called when the user navigates.
- **Authorization:** [user-role-based](https://layrjs.com/docs/v2/reference/with-roles) authorizations can be set to restrict some attributes or methods.
- **Interoperability:** the backend is exposed through a [Deepr API](https://deepr.io) so that you can consume it from any frontend even though it's not built with Layr. And if you want to bring a more standard API (e.g., REST) to your backend, it's straightforward to add such an API in your Layr backend.
- **Integrations:** integration helpers are provided to facilitate the integration of the most popular libraries or services. Currently, only two integration helpers are available: [react-integration](https://layrjs.com/docs/v2/reference/react-integration) and [aws-integration](https://layrjs.com/docs/v2/reference/aws-integration). But more should come shortly.

#### Core Principles

Here's a quick taste of the core principles upon which Layr is built:

- **Object-oriented:** Layr embraces the object-oriented approach in all aspects of an app and allows you to organize your code in a way that is as cohesive as possible.
- **Low-level:** Layr is designed to be as closest as possible to the language, and in many ways, it can be seen as a [language extension](https://layrjs.com/blog/articles/Getting-the-Right-Level-of-Generalization-7xpk37).
- **Unopinionated:** Layr has strong opinions about itself but doesn't force you to use external libraries, services, or tools.

#### Compatibility

Layr is implemented in [TypeScript](https://www.typescriptlang.org/), but you can use either JavaScript or TypeScript to build your app.

If you are using JavaScript, you'll need to compile your code with [Babel](https://babeljs.io/) to take advantage of some novel JavaScript features such as "decorators".

If you are using TypeScript, all you need is the TypeScript compiler.

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
