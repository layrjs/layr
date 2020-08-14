import Koa from 'koa';
import type {Server} from 'http';
import logger from 'koa-logger';
import jsonError from 'koa-json-error';
import cors from '@koa/cors';
import type {Component} from '@liaison/component';
import type {ComponentServer} from '@liaison/component-server';
import {ensureComponentServer} from '@liaison/component-server';
import {serveComponent, ServeComponentOptions} from '@liaison/component-koa-middleware';
import debugModule from 'debug';

const debug = debugModule('liaison:component-http-server');
// To display the debug log, set this environment:
// DEBUG=liaison:component-http-server DEBUG_DEPTH=10

const DEFAULT_PORT = 3333;

export type ComponentHTTPServerOptions = {port?: number} & ServeComponentOptions;

/**
 * A class allowing to serve a root [`Component`](https://liaison.dev/docs/v1/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://liaison.dev/docs/v1/reference/component-http-client).
 *
 * This class provides a basic HTTP server providing one endpoint to serve your root component. If you wish to build an HTTP server providing multiple endpoints, you can use a middleware such as [`component-express-middleware`](https://liaison.dev/docs/v1/reference/component-express-middleware), or implement the necessary plumbing to integrate a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) in your custom HTTP server.
 *
 * #### Usage
 *
 * Create an instance of `ComponentHTTPServer` by specifying the root [`Component`](https://liaison.dev/docs/v1/reference/component) you want to serve, and use the [`start()`](https://liaison.dev/docs/v1/reference/component-http-server#start-instance-method) method to start the server.
 *
 * See an example of use in [`ComponentHTTPClient`](https://liaison.dev/docs/v1/reference/component-http-client).
 */
export class ComponentHTTPServer {
  _componentServer: ComponentServer;
  _port: number;
  _serveComponentOptions: ServeComponentOptions;

  /**
   * Creates a component HTTP server.
   *
   * @param componentOrComponentServer The root [`Component`](https://liaison.dev/docs/v1/reference/component) class to serve. An instance of a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server).
   * @param [options.port] A number specifying the TCP port to listen to (default: `3333`).
   * @param [options.version] A number specifying the version of the created [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) (default: `undefined`).
   *
   * @returns A `ComponentHTTPServer` instance.
   *
   * @category Creation
   */
  constructor(
    componentOrComponentServer: typeof Component | ComponentServer,
    options: ComponentHTTPServerOptions = {}
  ) {
    const componentServer = ensureComponentServer(componentOrComponentServer, options);

    const {port = DEFAULT_PORT, limit, delay, errorRate} = options;

    this._componentServer = componentServer;
    this._port = port;
    this._serveComponentOptions = {limit, delay, errorRate};
  }

  _server: Server | undefined;

  /**
   * Starts the component HTTP server.
   *
   * @example
   * ```
   * const server = new ComponentHTTPServer(Movie, {port: 3210});
   *
   * await server.start();
   * ```
   *
   * @category Methods
   * @async
   */
  start() {
    if (this._server !== undefined) {
      throw new Error('The component HTTP server is already started');
    }

    const koa = new Koa();

    koa.use(
      logger((message) => {
        debug(message);
      })
    );

    koa.use(jsonError());

    koa.use(cors({maxAge: 900})); // 15 minutes

    koa.use(serveComponent(this._componentServer, this._serveComponentOptions));

    return new Promise((resolve) => {
      this._server = koa.listen(this._port, () => {
        debug(`Component HTTP server started (port: ${this._port})`);
        resolve();
      });
    });
  }

  /**
   * Stops the component HTTP server.
   *
   * @category Methods
   * @async
   */
  stop() {
    const server = this._server;

    if (server === undefined) {
      throw new Error('The component HTTP server is not started');
    }

    return new Promise((resolve) => {
      server.close(() => {
        this._server = undefined;
        debug(`Component HTTP server stopped`);
        resolve();
      });
    });
  }
}
