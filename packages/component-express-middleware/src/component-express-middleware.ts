/**
 * @module component-express-middleware
 *
 * An [Express](https://expressjs.com/) middleware allowing to serve a root [`Component`](https://liaison.dev/docs/v1/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://liaison.dev/docs/v1/reference/component-http-client).
 *
 * #### Usage
 *
 * Call the [`serveComponent()`](https://liaison.dev/docs/v1/reference/component-express-middleware#serve-component-function) function to create a middleware for your Express application.
 *
 * **Example:**
 *
 * ```
 * import express from 'express';
 * import {Component} from '@liaison/component';
 * import {serveComponent} from '@liaison/component-express-middleware';
 *
 * class Movie extends Component {
 *   // ...
 * }
 *
 * const app = express();
 *
 * app.use('/api', serveComponent(Movie));
 *
 * app.listen(3210);
 * ```
 */

import type {Component} from '@liaison/component';
import {ensureComponentServer} from '@liaison/component-server';
import type {ComponentServer, ComponentServerOptions} from '@liaison/component-server';
import body from 'co-body';
import httpError from 'http-errors';
import type {IncomingMessage, ServerResponse} from 'http';
import sleep from 'sleep-promise';

const DEFAULT_LIMIT = '8mb';

type Request = IncomingMessage & {url: string};

type Response = ServerResponse & {json: (data: unknown) => void};

export type ServeComponentOptions = ComponentServerOptions & {
  limit?: number | string;
  delay?: number;
  errorRate?: number;
};

/**
 * Creates an [Express](https://expressjs.com/) middleware exposing the specified root [`Component`](https://liaison.dev/docs/v1/reference/component) class.
 *
 * @param componentOrComponentServer The root [`Component`](https://liaison.dev/docs/v1/reference/component) class to serve. An instance of a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server).
 * @param [options.version] A number specifying the version of the created [`ComponentServer`](https://liaison.dev/docs/v1/reference/component-server) (default: `undefined`).
 *
 * @returns An Express middleware.
 *
 * @category Functions
 */
export function serveComponent(
  componentOrComponentServer: typeof Component | ComponentServer,
  options: ServeComponentOptions = {}
) {
  const componentServer = ensureComponentServer(componentOrComponentServer, options);

  const {limit = DEFAULT_LIMIT, delay = 0, errorRate = 0} = options;

  return async function (request: Request, response: Response) {
    if (delay > 0) {
      await sleep(delay);
    }

    if (errorRate > 0) {
      const threshold = errorRate / 100;

      if (Math.random() < threshold) {
        throw httpError(500, 'A simulated error occurred while handling a component server query');
      }
    }

    if (request.url !== '/') {
      throw httpError(404);
    }

    if (request.method === 'GET') {
      response.json(await componentServer.receive({query: {'introspect=>': {'()': []}}}));
      return;
    }

    if (request.method === 'POST') {
      const {query, components, version} = await body.json(request, {limit, strict: true});
      response.json(await componentServer.receive({query, components, version}));
      return;
    }

    throw httpError(405);
  };
}
