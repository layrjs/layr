import body from 'co-body';
import sleep from 'sleep-promise';
import {getTypeOf} from 'core-helpers';
import ow from 'ow';

const DEFAULT_LIMIT = '8mb';

export function serveComponents(componentServer, options = {}) {
  if (typeof componentServer?.constructor?.isComponentServer !== 'function') {
    throw new Error(
      `Expected a component server, but received a value of type '${getTypeOf(componentServer)}'`
    );
  }

  ow(
    options,
    'options',
    ow.object.exactShape({
      limit: ow.optional.any(ow.integer, ow.string.nonEmpty),
      delay: ow.optional.number,
      errorRate: ow.optional.number
    })
  );

  const {limit = DEFAULT_LIMIT, delay = 0, errorRate = 0} = options;

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

    const {query, components, version} = await body.json(ctx.req, {limit, strict: true});

    ctx.body = await componentServer.receive({query, components, version});
  };
}
