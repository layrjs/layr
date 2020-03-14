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
    async receiveQuery(query, options = {}) {
      ow(query, 'query', ow.object);
      ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

      const {version} = options;

      debug(`Sending query to remote layer (url: %o, query: %o)`, url, query);

      const json = {query, version};

      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(json)
      });

      const result = await response.json();

      debug(`Query sent to remote layer (url: %o, result: %o)`, url, result);

      if (response.status !== 200) {
        const {message = 'An error occurred while sending query to remote layer', ...attributes} =
          result ?? {};

        throw Object.assign(new Error(message), attributes);
      }

      return result;
    }
  };
}
