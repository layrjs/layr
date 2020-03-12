import {ComponentServer} from '@liaison/component-server';
import body from 'co-body';
import ow from 'ow';

const DEFAULT_LIMIT = '8mb';

export function serveComponents(componentProvider, options = {}) {
  ow(componentProvider, 'componentProvider', ow.function);
  ow(
    options,
    'options',
    ow.object.exactShape({
      version: ow.optional.number.integer,
      limit: ow.optional.any(ow.integer, ow.string.nonEmpty)
    })
  );

  const {version, limit = DEFAULT_LIMIT} = options;

  const componentServer = new ComponentServer(componentProvider, {version});

  return async function(ctx) {
    if (ctx.method !== 'POST') {
      ctx.throw(405);
    }

    const {query, version} = await body.json(ctx.req, {limit, strict: true});

    ctx.body = await componentServer.receiveQuery(query, {version});
  };
}
