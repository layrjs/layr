/**
 * @module component-koa-middleware
 *
 * A [Koa](https://koajs.com/) middleware allowing to serve a root [`Component`](https://layrjs.com/docs/v2/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://layrjs.com/docs/v2/reference/component-http-client).
 *
 * #### Usage
 *
 * Call the [`serveComponent()`](https://layrjs.com/docs/v2/reference/component-koa-middleware#serve-component-function) function to create a middleware for your Koa app.
 *
 * **Example:**
 *
 * ```
 * import Koa from 'koa';
 * import {Component} from '@layr/component';
 * import {serveComponent} from '@layr/component-koa-middleware';
 *
 * class Movie extends Component {
 *   // ...
 * }
 *
 * const app = new Koa();
 *
 * // Serve the `Movie` component at the root ('/')
 * app.use(serveComponent(Movie));
 *
 * app.listen(3210);
 * ```
 *
 * If you want to serve your component at a specific URL, you can use [`koa-mount`](https://github.com/koajs/mount):
 *
 * ```
 * import mount from 'koa-mount';
 *
 * // Serve the `Movie` component at a specific URL ('/api')
 * app.use(mount('/api', serveComponent(Movie)));
 * ```
 */

import type {Component} from '@layr/component';
import {ensureComponentServer} from '@layr/component-server';
import type {ComponentServer, ComponentServerOptions} from '@layr/component-server';
import {callRouteByURL, isRoutableClass} from '@layr/routable';
import type {Context} from 'koa';
import getRawBody from 'raw-body';
import mime from 'mime-types';
import sleep from 'sleep-promise';

const DEFAULT_LIMIT = '8mb';

export type ServeComponentOptions = ComponentServerOptions & {
  limit?: number | string;
  delay?: number;
  errorRate?: number;
};

/**
 * Creates a [Koa](https://koajs.com/) middleware exposing the specified root [`Component`](https://layrjs.com/docs/v2/reference/component) class.
 *
 * @param componentOrComponentServer The root [`Component`](https://layrjs.com/docs/v2/reference/component) class to serve. An instance of a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server).
 * @param [options.version] A number specifying the version of the created [`ComponentServer`](https://layrjs.com/docs/v2/reference/component-server) (default: `undefined`).
 *
 * @returns A Koa middleware.
 *
 * @category Functions
 */
export function serveComponent(
  componentOrComponentServer: typeof Component | ComponentServer,
  options: ServeComponentOptions = {}
) {
  const componentServer = ensureComponentServer(componentOrComponentServer, options);
  const component = componentServer.getComponent();
  const routableComponent = isRoutableClass(component) ? component : undefined;

  const {limit = DEFAULT_LIMIT, delay = 0, errorRate = 0} = options;

  return async function (ctx: Context) {
    if (delay > 0) {
      await sleep(delay);
    }

    if (errorRate > 0) {
      const threshold = errorRate / 100;

      if (Math.random() < threshold) {
        throw new Error('A simulated error occurred while handling a component server query');
      }
    }

    const method = ctx.request.method;
    const url = ctx.request.url;
    const headers = (ctx.request.headers as Record<string, string>) ?? {};
    const contentType = headers['content-type'] || 'application/octet-stream';
    const charset = mime.charset(contentType) || undefined;
    const body: string | Buffer = await getRawBody(ctx.req, {limit, encoding: charset});

    if (url === '/') {
      if (method === 'GET') {
        ctx.response.body = await componentServer.receive({query: {'introspect=>': {'()': []}}});
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
        ctx.response.body = await componentServer.receive({query, components, version});
        return;
      }

      ctx.throw(405);
    }

    if (routableComponent !== undefined) {
      const routableComponentFork = routableComponent.fork();

      await routableComponentFork.initialize();

      const routeResponse: {
        status: number;
        headers?: Record<string, string>;
        body?: string | Buffer;
      } = await callRouteByURL(routableComponentFork, url, {method, headers, body});

      if (typeof routeResponse?.status !== 'number') {
        throw new Error(
          `Unexpected response \`${JSON.stringify(
            routeResponse
          )}\` returned by a component route (a proper response should be an object of the shape \`{status: number; headers?: Record<string, string>; body?: string | Buffer;}\`)`
        );
      }

      ctx.response.status = routeResponse.status;

      if (routeResponse.headers !== undefined) {
        ctx.response.set(routeResponse.headers);
      }

      if (routeResponse.body !== undefined) {
        ctx.response.body = routeResponse.body;
      }

      return;
    }

    ctx.throw(404);
  };
}
