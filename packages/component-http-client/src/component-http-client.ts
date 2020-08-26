import {ComponentClient, ComponentClientOptions} from '@liaison/component-client';
import fetch from 'cross-fetch';
import type {PlainObject} from 'core-helpers';

export type ComponentHTTPClientOptions = ComponentClientOptions;

/**
 * *Inherits from [`ComponentClient`](https://liaison.dev/docs/v1/reference/component-client).*
 *
 * A class allowing to access a root [`Component`](https://liaison.dev/docs/v1/reference/component) that is served by a [`ComponentHTTPServer`](https://liaison.dev/docs/v1/reference/component-http-server), a middleware such as [`component-express-middleware`](https://liaison.dev/docs/v1/reference/component-express-middleware), or any HTTP server exposing a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server).
 *
 * #### Usage
 *
 * Create an instance of `ComponentHTTPClient` by specifying the URL of the component server, and use the [`getComponent()`](https://liaison.dev/docs/v1/reference/component-http-client#get-component-instance-method) method to get the served component.
 *
 * For example, to access a `Movie` component that is served by a component server, you could do the following:
 *
 * ```
 * // JS
 *
 * // backend.js
 *
 * import {Component, attribute, method, expose} from '@liaison/component';
 * import {ComponentHTTPServer} from '@liaison/component-http-server';
 *
 * export class Movie extends Component {
 *   @expose({get: true, set: true}) @attribute('string') title;
 *
 *   @expose({call: true}) @method() async play() {
 *     return `Playing `${this.title}`...`;
 *   }
 * }
 *
 * const server = new ComponentHTTPServer(Movie, {port: 3210});
 *
 * server.start();
 * ```
 *
 * ```
 * // JS
 *
 * // frontend.js
 *
 * import {ComponentHTTPClient} from '@liaison/component-http-client';
 *
 * (async () => {
 *   const client = new ComponentHTTPClient('http://localhost:3210');
 *
 *   const Movie = await client.getComponent();
 *
 *   const movie = new Movie({title: 'Inception'});
 *
 *   await movie.play(); // => 'Playing Inception...'
 * })();
 * ```
 *
 * ```
 * // TS
 *
 * // backend.ts
 *
 * import {Component, attribute, method, expose} from '@liaison/component';
 * import {ComponentHTTPServer} from '@liaison/component-http-server';
 *
 * export class Movie extends Component {
 *   @expose({get: true, set: true}) @attribute('string') title!: string;
 *
 *   @expose({call: true}) @method() async play() {
 *     return `Playing `${this.title}`...`;
 *   }
 * }
 *
 * const server = new ComponentHTTPServer(Movie, {port: 3210});
 *
 * server.start();
 * ```
 *
 * ```
 * // TS
 *
 * // frontend.ts
 *
 * import {ComponentHTTPClient} from '@liaison/component-http-client';
 *
 * import type {Movie as MovieType} from './backend';
 *
 * (async () => {
 *   const client = new ComponentHTTPClient('http://localhost:3210');
 *
 *   const Movie = (await client.getComponent()) as typeof MovieType;
 *
 *   const movie = new Movie({title: 'Inception'});
 *
 *   await movie.play(); // => 'Playing Inception...'
 * })();
 * ```
 */
export class ComponentHTTPClient extends ComponentClient {
  /**
   * Creates a component HTTP client.
   *
   * @param url A string specifying the URL of the component server to connect to.
   * @param [options.version] A number specifying the expected version of the component server (default: `undefined`). If a version is specified, an error is thrown when a request is sent and the component server has a different version. The thrown error is a JavaScript `Error` instance with a `code` attribute set to `'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'`.
   * @param [options.mixins] An array of the component mixins (e.g., [`Storable`](https://liaison.dev/docs/v1/reference/storable)) to use when constructing the components exposed by the component server (default: `[]`).
   *
   * @returns A `ComponentHTTPClient` instance.
   *
   * @category Creation
   */
  constructor(url: string, options: ComponentHTTPClientOptions = {}) {
    const componentServer = createComponentServer(url);

    super(componentServer, {...options, batchable: true});
  }

  /**
   * @method getComponent
   *
   * Gets the component that is served by the component server.
   *
   * @returns A [`Component`](https://liaison.dev/docs/v1/reference/component) class.
   *
   * @examplelink See an [example of use](https://liaison.dev/docs/v1/reference/component-http-client#usage) above.
   *
   * @category Getting the Served Component
   * @async
   */
}

function createComponentServer(url: string) {
  return {
    async receive(request: {query: PlainObject; components?: PlainObject[]; version?: number}) {
      const {query, components, version} = request;

      const json = {query, components, version};

      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(json)
      });

      const response = await fetchResponse.json();

      if (fetchResponse.status !== 200) {
        const {
          message = 'An error occurred while sending query to remote components',
          ...attributes
        } = response ?? {};

        throw Object.assign(new Error(message), attributes);
      }

      return response;
    }
  };
}
