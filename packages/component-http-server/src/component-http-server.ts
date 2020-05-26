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

export class ComponentHTTPServer {
  _componentServer: ComponentServer;
  _port: number;
  _serveComponentOptions: ServeComponentOptions;

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
