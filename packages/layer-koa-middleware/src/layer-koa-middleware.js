import {LayerServer} from '@liaison/layer-server';
import body from 'co-body';
import ow from 'ow';

const DEFAULT_LIMIT = '8mb';

export function serveLayer(layerProvider, options = {}) {
  ow(layerProvider, 'layerProvider', ow.function);
  ow(
    options,
    'options',
    ow.object.exactShape({
      version: ow.optional.number.integer,
      limit: ow.optional.any(ow.integer, ow.string.nonEmpty)
    })
  );

  const {version, limit = DEFAULT_LIMIT} = options;

  const layerServer = new LayerServer(layerProvider, {version});

  return async function(ctx) {
    if (ctx.method !== 'POST') {
      ctx.throw(405);
    }

    const {query, version} = await body.json(ctx.req, {limit, strict: true});

    ctx.body = await layerServer.receiveQuery(query, {version});
  };
}
