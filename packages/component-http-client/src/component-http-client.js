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

    const componentServer = createComponentServerProxy(url);

    super(componentServer, {version, baseComponents});
  }
}

function createComponentServerProxy(url) {
  return {
    async receiveQuery(query, options = {}) {
      ow(query, 'query', ow.object);
      ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

      const {version} = options;

      debug(`Sending query to remote components (url: %o, query: %o)`, url, query);

      const json = {query, version};

      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(json)
      });

      const result = await response.json();

      debug(`Query sent to remote components (url: %o, result: %o)`, url, result);

      if (response.status !== 200) {
        const {
          message = 'An error occurred while sending query to remote components',
          ...attributes
        } = result ?? {};

        throw Object.assign(new Error(message), attributes);
      }

      return result;
    }
  };
}
