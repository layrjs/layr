import Koa from 'koa';
import logger from 'koa-logger';
import jsonError from 'koa-json-error';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import debugModule from 'debug';

const debug = debugModule('liaison:layer:http-server');
// To display the debug log, set this environment:
// DEBUG=liaison:layer:http-server DEBUG_DEPTH=10

const DEFAULT_PORT = 3333;

export class LayerHTTPServer {
  constructor(layerCreator, {port = DEFAULT_PORT} = {}) {
    if (!layerCreator) {
      throw new Error(`'layerCreator' parameter is missing`);
    }

    this._layerCreator = layerCreator;
    this._port = port;

    this._koa = this._createKoa();
  }

  _createKoa() {
    const koa = new Koa();

    koa.use(
      logger(message => {
        debug(message);
      })
    );
    koa.use(jsonError());
    koa.use(cors({maxAge: 900})); // 15 minutes
    koa.use(bodyParser({enableTypes: ['json'], jsonLimit: '8mb'}));

    koa.use(async ctx => {
      const layer = await this._layerCreator();

      if (ctx.method === 'GET') {
        ctx.body = layer.introspect();
      } else if (ctx.method === 'POST') {
        try {
          const {query, items, source} = ctx.request.body;
          const result = await layer.receiveQuery({query, items, source});
          ctx.body = {result};
        } catch (err) {
          const error = {message: err.message, ...err};
          ctx.body = {error};
        }
      } else {
        throw new Error('Invalid HTTP request');
      }
    });

    return koa;
  }

  start() {
    if (this._server) {
      throw new Error('Layer server already started');
    }

    return new Promise(resolve => {
      this._server = this._koa.listen(this._port, () => {
        debug(`Layer server started (port: ${this._port})`);
        resolve();
      });
    });
  }

  stop() {
    if (!this._server) {
      throw new Error('Layer server has not been started');
    }

    return new Promise(resolve => {
      this._server.close(() => {
        debug(`Layer server stopped`);
        resolve();
      });
    });
  }
}
