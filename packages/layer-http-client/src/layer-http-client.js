import {LayerClient} from '@liaison/layer-client';
import fetch from 'cross-fetch';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('liaison:layer-http-client');

// To display the debug log, set this environment:
// DEBUG=liaison:layer-http-client DEBUG_DEPTH=10

export class LayerHTTPClient extends LayerClient {
  constructor(url, options = {}) {
    ow(url, 'url', ow.string.nonEmpty);
    ow(
      options,
      'options',
      ow.object.exactShape({version: ow.optional.number.integer, baseComponents: ow.optional.array})
    );

    const {version, baseComponents = []} = options;

    const layerServer = createLayerServer(url);

    super(layerServer, {version, baseComponents});
  }
}

function createLayerServer(url) {
  return {
    async receive(request) {
      ow(
        request,
        'request',
        ow.object.exactShape({
          query: ow.object,
          components: ow.optional.array,
          version: ow.optional.number.integer
        })
      );

      const {query, components, version} = request;

      debug(`Sending query to remote layer (url: %o, request: %o)`, url, {query, components});

      const json = {query, components, version};

      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(json)
      });

      const response = await fetchResponse.json();

      debug(`Query sent to remote layer (url: %o, response: %o)`, url, response);

      if (fetchResponse.status !== 200) {
        const {message = 'An error occurred while sending query to remote layer', ...attributes} =
          response ?? {};

        throw Object.assign(new Error(message), attributes);
      }

      return response;
    }
  };
}
