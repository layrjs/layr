import type {Component} from '@liaison/component';
import {ensureComponentServer} from '@liaison/component-server';
import type {ComponentServer, ComponentServerOptions} from '@liaison/component-server';
import body from 'co-body';
import sleep from 'sleep-promise';

const DEFAULT_LIMIT = '8mb';

export type ServeComponentOptions = ComponentServerOptions & {
  limit?: number | string;
  delay?: number;
  errorRate?: number;
};

export function serveComponent(
  componentOrComponentServer: typeof Component | ComponentServer,
  options: ServeComponentOptions = {}
) {
  const componentServer = ensureComponentServer(componentOrComponentServer, options);

  const {limit = DEFAULT_LIMIT, delay = 0, errorRate = 0} = options;

  return async function (ctx: any) {
    if (ctx.method !== 'POST') {
      ctx.throw(405);
    }

    if (delay > 0) {
      await sleep(delay);
    }

    if (errorRate > 0) {
      const threshold = errorRate / 100;

      if (Math.random() < threshold) {
        throw new Error('A simulated error occurred while handling a component server query');
      }
    }

    const {query, components, version} = await body.json(ctx.req, {limit, strict: true});

    ctx.body = await componentServer.receive({query, components, version});
  };
}
