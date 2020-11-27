<p align="center">
	<img src="assets/layr-logo-with-icon.svg" width="200" alt="Layr">
	<br>
	<br>
</p>

> Dramatically simplify full‑stack development.

## Overview

[Layr](https://layrjs.com) is a set of JavaScript/TypeScript libraries to dramatically simplify the development of full-stack applications.

Typically, a full-stack application is composed of a frontend and a backend running in two different environments that are connected through a web API (REST, GraphQL, etc.)

Separating the frontend and the backend is a good thing, but the problem is that building a web API usually leads to a lot of code scattering, duplication of knowledge, boilerplate, and accidental complexity.

Layr removes the need of building a web API and [reunites](https://dev.to/mvila/good-bye-web-apis-2bel) the frontend and the backend in a way that you can experience them as a single entity.

On the frontend side, Layr gives you [routing capabilities](https://layrjs.com/docs/v1/reference/routable) and [object observability](https://layrjs.com/docs/v1/reference/observable) so that in most cases you don't need to add an external router or a state manager.

Last but not least, Layr offers an [ORM](https://layrjs.com/docs/v1/reference/storable) to make data storage as easy as possible.

## Core Features

Layr provides everything you need to build a full-stack application from start to finish:

- **Cross-layer inheritance:** a frontend class can "inherit" from a backend class so that some [attributes](https://layrjs.com/docs/v1/reference/attribute) can be automatically transported between the frontend and the backend, and some backend's [methods](https://layrjs.com/docs/v1/reference/method) can be easily called from the frontend.
- **Controlled attributes:** an attribute can be [type-checked](https://layrjs.com/docs/v1/reference/value-type) at runtime, [validated](https://layrjs.com/docs/v1/reference/validator), [serialized](https://layrjs.com/docs/v1/reference/component#serialization), and [observed](https://layrjs.com/docs/v1/reference/observable).
- **Remote method invocation:** a backend's method can be [exposed](https://layrjs.com/docs/v1/reference/component#expose-decorator) so that the frontend can call it without the need to build a web API.
- **Storage:** a class instance can be [persisted](https://layrjs.com/docs/v1/reference/storable) in a database. Currently, only [MongoDB](https://www.mongodb.com/) is supported, but more databases will be added soon.
- **Routing:** a method can be [associated with an URL](https://layrjs.com/docs/v1/reference/routable) and controlled by a [router](https://layrjs.com/docs/v1/reference/router) so that this method is automatically called when the user navigates.
- **Authorization:** [role-based](https://layrjs.com/docs/v1/reference/with-roles) authorizations can be set to restrict an attribute or a method for some users.
- **Interoperability:** the backend is exposed through a [Deepr API](https://deepr.io) so that you can consume it from any frontend even though it's not built with Layr. And if you want to bring a more traditional API (e.g., REST) to your backend, it's very easy to build such an API on top of your Layr backend.
- **Integrations:** integration helpers are provided to facilitate the integration of the most popular libraries or services. Currently, only two integration helpers are available: [react-integration](https://layrjs.com/docs/v1/reference/react-integration) and [aws-integration](https://layrjs.com/docs/v1/reference/aws-integration). But more should come shortly.

## Core Principles

Here's a quick taste of the core principles upon which Layr is built:

- **Object-oriented:** Layr embraces the object-oriented approach in all aspects of an application and allows you to organize your code in a way that is as cohesive as possible.
- **Low-level:** Layr is designed to be as closest as possible to the language and in many ways, it can be seen as a [language extension](https://layrjs.com/blog/articles/Getting-the-Right-Level-of-Generalization-7xpk37).
- **Unopinionated:** Layr has strong opinions about itself but doesn't force you to use any external libraries, services, or tools.

## Documentation

Check out the [documentation](https://layrjs.com/docs) for some "getting started" guides and a comprehensive description of the API.

## Compatibility

Layr is implemented in [TypeScript](https://www.typescriptlang.org/) but you can use either JavaScript or TypeScript to build your application.

If you are using JavaScript, you'll need to compile your code with [Babel](https://babeljs.io/) to take advantage of some novel JavaScript features such as "decorators".

If you are using TypeScript, all you need is the TypeScript compiler.

To run your application, you'll need a JavaScript runtime for both the frontend and the backend.

### Frontend

#### Web

Any modern browser should work fine.

Here are the minimum versions with which Layr is tested:

- Chrome v51
- Safari v10
- Firefox v54
- Edge Chromium

#### Mobile and Desktop

Any mobile or desktop application framework using JavaScript (such as [React Native](https://reactnative.dev/) or [Electron](https://www.electronjs.org/)) should work fine.

### Backend

Any environment running [Node.js](https://nodejs.org/) v10 or later is supported.

## Examples

All the examples provided in the [documentation](https://layrjs.com/docs) are available in the [Layr repository](https://github.com/layrjs/layr/tree/master/examples).

Also, here are some more advanced examples that you can check out:

- [CRUD Example App (JS)](https://github.com/layrjs/crud-example-app-js-webpack)
- [CRUD Example App (TS)](https://github.com/layrjs/crud-example-app-ts-webpack)
- [CRUD Example App (React Native)](https://github.com/layrjs/crud-example-app-react-native-js)
- [RealWorld Example App (JS)](https://github.com/layrjs/react-layr-realworld-example-app)
- [Layr Website (TS)](https://github.com/layrjs/layr/tree/master/website)

## Roadmap

#### Components

- [x] Basic components
- [x] Controlled attributes
- [x] Component provision
- [x] Cross-layer inheritance
- [x] Remote method invocation
- [ ] Optimized serialization
- [ ] Weak Identity Map
- [ ] Component subscriptions (realtime updates)
- [ ] HTTP Caching

#### Storage

- [x] Basic storage (MongoDB)
- [ ] Transactions
- [ ] Ability to query attribute of referenced components (LEFT JOIN)
- [ ] Sugar to query reverse relationships
- [ ] Support for more databases (PostgreSQL, MySQL, DynamoDB,...)
- [ ] Query subscriptions (realtime updates)

#### Routing

- [x] Basic routing
- [ ] Nested routing

#### Authorizations

- [x] Basic authorizations
- [x] Role-based authorizations

#### CLI

- [ ] Scaffolding
- [ ] Deployment

#### Integrations

- [x] React integration
- [x] Basic AWS integration

## Contributing

Contributions are welcome.

Before contributing please read the [code of conduct](https://github.com/layrjs/layr/blob/master/CODE_OF_CONDUCT.md) and search the [issue tracker](https://github.com/layrjs/layr/issues) to find out if your issue has already been discussed before.

To contribute, [fork this repository](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo/), commit your changes, and [send a pull request](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests).

## License

MIT
