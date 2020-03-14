import Koa from 'koa';
import logger from 'koa-logger';
import jsonError from 'koa-json-error';
import cors from '@koa/cors';
import {serveLayer} from '@liaison/layer-koa-middleware';
import debugModule from 'debug';
import ow from 'ow';

const debug = debugModule('liaison:layer-http-server');
// To display the debug log, set this environment:
// DEBUG=liaison:layer-http-server DEBUG_DEPTH=10

const DEFAULT_PORT = 3333;
const DEFAULT_LIMIT = '8mb';

export class LayerHTTPServer {
  constructor(layerProvider, options = {}) {
    ow(layerProvider, 'layerProvider', ow.function);
    ow(
      options,
      'options',
      ow.object.exactShape({
        version: ow.optional.number.integer,
        port: ow.optional.number.integer,
        limit: ow.optional.any(ow.integer, ow.string.nonEmpty)
      })
    );

    const {version, port = DEFAULT_PORT, limit = DEFAULT_LIMIT} = options;

    this._layerProvider = layerProvider;
    this._version = version;
    this._port = port;
    this._limit = limit;
  }

  start() {
    if (this._server) {
      throw new Error('The layer HTTP server is already started');
    }

    const koa = new Koa();

    koa.use(
      logger(message => {
        debug(message);
      })
    );

    koa.use(jsonError());

    koa.use(cors({maxAge: 900})); // 15 minutes

    koa.use(serveLayer(this._layerProvider, {version: this._version, limit: this._limit}));

    return new Promise(resolve => {
      this._server = koa.listen(this._port, () => {
        debug(`Layer HTTP server started (port: ${this._port})`);
        resolve();
      });
    });
  }

  stop() {
    if (!this._server) {
      throw new Error('The layer HTTP server is not started');
    }

    return new Promise(resolve => {
      this._server.close(() => {
        this._server = undefined;
        debug(`Layer HTTP server stopped`);
        resolve();
      });
    });
  }
}
