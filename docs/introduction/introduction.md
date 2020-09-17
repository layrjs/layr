### Introduction

Liaison is a set of JavaScript/TypeScript libraries to dramatically simplify the development of full-stack applications.

Typically, a full-stack application is composed of a frontend and a backend running in two different environments that are connected through a web API (REST, GraphQL, etc.)

Separating the frontend and the backend is a good thing, but the problem is that building a web API usually leads to a lot of code scattering, duplication of knowledge, boilerplate, and accidental complexity.

Liaison removes the need of building a web API and [reunites](https://liaison.dev/blog/articles/Simplify-Full-Stack-Development-with-a-Unified-Architecture-187fr1) the frontend and the backend in a way that you can experience them as a single entity.

Also, Liaison offers an [ORM](https://liaison.dev/docs/v1/reference/storable) to make data storage as easy as possible.

Lastly, on the frontend side, Liaison gives you [routing capabilities](https://liaison.dev/docs/v1/reference/routable) and [object observability](https://liaison.dev/docs/v1/reference/observable) so that in most cases you don't need to add an external router or a state manager.

#### Core Features

Liaison provides everything you need to build a full-stack application from start to finish:

- **Cross-layer inheritance:** a frontend class can "inherit" from a backend class so that some [attributes](https://liaison.dev/docs/v1/reference/attribute) can be automatically transported between the frontend and the backend, and some backend's [methods](https://liaison.dev/docs/v1/reference/method) can be easily called from the frontend.
- **Controlled attributes:** an attribute can be [type-checked](https://liaison.dev/docs/v1/reference/value-type) at runtime, [validated](https://liaison.dev/docs/v1/reference/validator), [serialized](https://liaison.dev/docs/v1/reference/component#serialization), and [observed](https://liaison.dev/docs/v1/reference/observable).
- **Remote method invocation:** a backend's method can be [exposed](https://liaison.dev/docs/v1/reference/component#expose-decorator) so that the frontend can call it without the need to build a web API.
- **Storage:** a class instance can be [persisted](https://liaison.dev/docs/v1/reference/storable) in a database. Currently, only [MongoDB](https://www.mongodb.com/) is supported, but more databases will be added soon.
- **Routing:** a method can be [associated with an URL](https://liaison.dev/docs/v1/reference/routable) and controlled by a [router](https://liaison.dev/docs/v1/reference/router) so that this method is automatically called when the user navigates.
- **Authorization:** [role-based](https://liaison.dev/docs/v1/reference/with-roles) authorizations can be set to restrict an attribute or a method for some users.
- **Interoperability:** the backend is exposed through a [Deepr API](https://deepr.io) so that you can consume it from any frontend even though it's not built with Liaison. And if you want to bring a more traditional API (e.g., REST) to your backend, it's very easy to build such an API on top of your Liaison backend.
- **Integrations:** integration helpers are provided to facilitate the integration of the most popular libraries or services. Currently, only two integration helpers are available: [react-integration](https://liaison.dev/docs/v1/reference/react-integration) and [aws-integration](https://liaison.dev/docs/v1/reference/aws-integration). But more should come shortly.

#### Core Principles

Here's a quick taste of the core principles upon which Liaison is built:

- **Object-oriented:** Liaison embraces the object-oriented approach in all aspects of an application and allows you to organize your code in a way that is as cohesive as possible.
- **Low-level:** Liaison is designed to be as closest as possible to the language and in many ways, it can be seen as a [language extension](https://liaison.dev/blog/articles/Getting-the-Right-Level-of-Generalization-7xpk37).
- **Unopinionated:** Liaison has strong opinions about itself but doesn't force you to use any external libraries, services, or tools.

#### Compatibility

Liaison is implemented in [TypeScript](https://www.typescriptlang.org/) but you can use either JavaScript or TypeScript to build your application.

If you are using JavaScript, you'll need to compile your code with [Babel](https://babeljs.io/) to take advantage of some novel JavaScript features such as "decorators".

If you are using TypeScript, all you need is the TypeScript compiler.

To run your application, you'll need a JavaScript runtime for both the frontend and the backend.

##### Frontend

Any modern browser should work fine, and here are the minimum versions with which Liaison is tested:

- Chrome v51
- Safari v10
- Firefox v54
- Edge Chromium

##### Backend

Any environment running [Node.js](https://nodejs.org/) v10 or later is supported.

#### Examples

All the examples provided in the documentation are available in the [Liaison repository](https://github.com/liaisonjs/liaison/tree/master/examples).

Also, here are some more advanced examples that you can check out:

- [CRUD Example App (JS)](https://github.com/liaisonjs/crud-example-app-js-webpack)
- [CRUD Example App (TS)](https://github.com/liaisonjs/crud-example-app-ts-webpack)
- [RealWorld Example App (JS)](https://github.com/liaisonjs/react-liaison-realworld-example-app)
- [Liaison Website (TS)](https://github.com/liaisonjs/liaison/tree/master/website)
