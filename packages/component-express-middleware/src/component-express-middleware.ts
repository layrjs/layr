/**
 * @module component-express-middleware
 *
 * An [Express](https://expressjs.com/) middleware allowing to serve a root [`Component`](https://layrjs.com/docs/v1/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://layrjs.com/docs/v1/reference/component-http-client).
 *
 * #### Usage
 *
 * Call the [`serveComponent()`](https://layrjs.com/docs/v1/reference/component-express-middleware#serve-component-function) function to create a middleware for your Express application.
 *
 * **Example:**
 *
 * ```
 * import express from 'express';
 * import {Component} from '@layr/component';
 * import {serveComponent} from '@layr/component-express-middleware';
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

import type {Component} from '@layr/component';
import {ensureComponentServer} from '@layr/component-server';
import type {ComponentServer, ComponentServerOptions} from '@layr/component-server';
import type {Request, Response} from 'express';
import getRawBody from 'raw-body';
import mime from 'mime-types';
import httpError from 'http-errors';
import sleep from 'sleep-promise';

const DEFAULT_LIMIT = '8mb';

export type ServeComponentOptions = ComponentServerOptions & {
  limit?: number | string;
  delay?: number;
  errorRate?: number;
};

/**
 * Creates an [Express](https://expressjs.com/) middleware exposing the specified root [`Component`](https://layrjs.com/docs/v1/reference/component) class.
 *
 * @param componentOrComponentServer The root [`Component`](https://layrjs.com/docs/v1/reference/component) class to serve. An instance of a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server).
 * @param [options.version] A number specifying the version of the created [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) (default: `undefined`).
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

  const router = componentServer.findRouter();

  return async function (req: Request, res: Response) {
    if (delay > 0) {
      await sleep(delay);
    }

    if (errorRate > 0) {
      const threshold = errorRate / 100;

      if (Math.random() < threshold) {
        throw httpError(500, 'A simulated error occurred while handling a component server query');
      }
    }

    const method = req.method;
    const url = req.url;
    const headers = (req.headers as Record<string, string>) ?? {};
    const contentType = headers['content-type'] || 'application/octet-stream';
    const charset = mime.charset(contentType) || undefined;
    const body: string | Buffer = await getRawBody(req, {limit, encoding: charset});

    if (url === '/') {
      if (method === 'GET') {
        res.json(await componentServer.receive({query: {'introspect=>': {'()': []}}}));
        return;
      }

      if (method === 'POST') {
        let parsedBody: any;

        if (typeof body !== 'string') {
          throw new Error(
            `Expected a body of type 'string', but received a value of type '${typeof body}'`
          );
        }

        try {
          parsedBody = JSON.parse(body);
        } catch (error) {
          throw new Error(`An error occurred while parsing a JSON body string ('${body}')`);
        }

        const {query, components, version} = parsedBody;
        res.json(await componentServer.receive({query, components, version}));
        return;
      }

      throw httpError(405);
    }

    if (router !== undefined) {
      const routeResponse: {
        status: number;
        headers?: Record<string, string>;
        body?: string | Buffer;
      } = await router.callRouteByURL(url, {method, headers, body});

      if (typeof routeResponse?.status !== 'number') {
        throw new Error(
          `Unexpected response \`${JSON.stringify(
            routeResponse
          )}\` returned by a component route (a proper response should be an object of the shape \`{status: number; headers?: Record<string, string>; body?: string | Buffer;}\`)`
        );
      }

      res.status(routeResponse.status);

      if (routeResponse.headers !== undefined) {
        res.set(routeResponse.headers);
      }

      if (routeResponse.body !== undefined) {
        res.send(routeResponse.body);
      } else {
        res.end();
      }

      return;
    }

    throw httpError(404);
  };
}
