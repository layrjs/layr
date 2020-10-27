/**
 * @module component-koa-middleware
 *
 * A [Koa](https://koajs.com/) middleware allowing to serve a root [`Component`](https://layrjs.com/docs/v1/reference/component) so it can be accessed by a [`ComponentHTTPClient`](https://layrjs.com/docs/v1/reference/component-http-client).
 *
 * #### Usage
 *
 * Call the [`serveComponent()`](https://layrjs.com/docs/v1/reference/component-koa-middleware#serve-component-function) function to create a middleware for your Koa application.
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
import body from 'co-body';
import sleep from 'sleep-promise';

const DEFAULT_LIMIT = '8mb';

export type ServeComponentOptions = ComponentServerOptions & {
  limit?: number | string;
  delay?: number;
  errorRate?: number;
};

/**
 * Creates a [Koa](https://koajs.com/) middleware exposing the specified root [`Component`](https://layrjs.com/docs/v1/reference/component) class.
 *
 * @param componentOrComponentServer The root [`Component`](https://layrjs.com/docs/v1/reference/component) class to serve. An instance of a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) will be created under the hood. Alternatively, you can pass an existing instance of a [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server).
 * @param [options.version] A number specifying the version of the created [`ComponentServer`](https://layrjs.com/docs/v1/reference/component-server) (default: `undefined`).
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

  const {limit = DEFAULT_LIMIT, delay = 0, errorRate = 0} = options;

  return async function (ctx: any) {
    if (delay > 0) {
      await sleep(delay);
    }

    if (errorRate > 0) {
      const threshold = errorRate / 100;

      if (Math.random() < threshold) {
        throw new Error('A simulated error occurred while handling a component server query');
      }
    }

    if (ctx.url !== '/') {
      ctx.throw(404);
    }

    if (ctx.method === 'GET') {
      ctx.body = await componentServer.receive({query: {'introspect=>': {'()': []}}});
      return;
    }

    if (ctx.method === 'POST') {
      const {query, components, version} = await body.json(ctx.req, {limit, strict: true});
      ctx.body = await componentServer.receive({query, components, version});
      return;
    }

    ctx.throw(405);
  };
}
