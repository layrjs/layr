import Koa from 'koa';
import logger from 'koa-logger';
import jsonError from 'koa-json-error';
import cors from '@koa/cors';
import {serveComponents} from '@liaison/component-koa-middleware';
import {getTypeOf} from 'core-helpers';
import debugModule from 'debug';
import ow from 'ow';

const debug = debugModule('liaison:component-http-server');
// To display the debug log, set this environment:
// DEBUG=liaison:component-http-server DEBUG_DEPTH=10

const DEFAULT_PORT = 3333;
const DEFAULT_LIMIT = '8mb';

export class ComponentHTTPServer {
  constructor(componentServer, options = {}) {
    if (typeof componentServer?.constructor?.isComponentServer !== 'function') {
      throw new Error(
        `Expected a component server, but received a value of type '${getTypeOf(componentServer)}'`
      );
    }

    ow(
      options,
      'options',
      ow.object.exactShape({
        port: ow.optional.number.integer,
        limit: ow.optional.any(ow.integer, ow.string.nonEmpty),
        delay: ow.optional.number,
        errorRate: ow.optional.number
      })
    );

    const {port = DEFAULT_PORT, limit = DEFAULT_LIMIT, delay, errorRate} = options;

    this._componentServer = componentServer;
    this._port = port;
    this._limit = limit;
    this._delay = delay;
    this._errorRate = errorRate;
  }

  start() {
    if (this._server) {
      throw new Error('The component HTTP server is already started');
    }

    const koa = new Koa();

    koa.use(
      logger(message => {
        debug(message);
      })
    );

    koa.use(jsonError());

    koa.use(cors({maxAge: 900})); // 15 minutes

    koa.use(
      serveComponents(this._componentServer, {
        limit: this._limit,
        delay: this._delay,
        errorRate: this._errorRate
      })
    );

    return new Promise(resolve => {
      this._server = koa.listen(this._port, () => {
        debug(`Component HTTP server started (port: ${this._port})`);
        resolve();
      });
    });
  }

  stop() {
    if (!this._server) {
      throw new Error('The component HTTP server is not started');
    }

    return new Promise(resolve => {
      this._server.close(() => {
        this._server = undefined;
        debug(`Component HTTP server stopped`);
        resolve();
      });
    });
  }
}
