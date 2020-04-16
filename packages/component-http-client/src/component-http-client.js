import {ComponentClient} from '@liaison/component-client';
import fetch from 'cross-fetch';
import ow from 'ow';
import debugModule from 'debug';

const debug = debugModule('liaison:component-http-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-http-client DEBUG_DEPTH=10

export class ComponentHTTPClient extends ComponentClient {
  constructor(url, options = {}) {
    ow(url, 'url', ow.string.nonEmpty);
    ow(
      options,
      'options',
      ow.object.exactShape({version: ow.optional.number.integer, baseComponents: ow.optional.array})
    );

    const {version, baseComponents = []} = options;

    const componentServer = createComponentServer(url);

    super(componentServer, {version, baseComponents});
  }
}

function createComponentServer(url) {
  return {
    async receiveQuery(request) {
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

      debug(`Sending query to remote components (url: %o, request: %o)`, url, {query, components});

      const json = {query, components, version};

      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(json)
      });

      const response = await fetchResponse.json();

      debug(`Query sent to remote components (url: %o, response: %o)`, url, response);

      if (fetchResponse.status !== 200) {
        const {
          message = 'An error occurred while sending query to remote components',
          ...attributes
        } = response ?? {};

        throw Object.assign(new Error(message), attributes);
      }

      return response;
    }
  };
}
