import {ComponentServer} from '@liaison/component-server';
import body from 'co-body';
import sleep from 'sleep-promise';
import ow from 'ow';

const DEFAULT_LIMIT = '8mb';

export function serveComponents(componentProvider, options = {}) {
  ow(componentProvider, 'componentProvider', ow.function);
  ow(
    options,
    'options',
    ow.object.exactShape({
      version: ow.optional.number.integer,
      limit: ow.optional.any(ow.integer, ow.string.nonEmpty),
      delay: ow.optional.number,
      errorRate: ow.optional.number
    })
  );

  const {version, limit = DEFAULT_LIMIT, delay = 0, errorRate = 0} = options;

  const componentServer = new ComponentServer(componentProvider, {version});

  return async function(ctx) {
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

    const {query, version} = await body.json(ctx.req, {limit, strict: true});

    ctx.body = await componentServer.receiveQuery(query, {version});
  };
}
