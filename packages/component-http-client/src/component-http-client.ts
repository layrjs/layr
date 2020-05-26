import {ComponentClient} from '@liaison/component-client';
import fetch from 'cross-fetch';
import type {PlainObject} from 'core-helpers';
import debugModule from 'debug';

const debug = debugModule('liaison:component-http-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-http-client DEBUG_DEPTH=10

export type ComponentHTTPClientOptions = {
  version?: number;
};

export class ComponentHTTPClient extends ComponentClient {
  constructor(url: string, options: ComponentHTTPClientOptions = {}) {
    const {version} = options;

    const componentServer = createComponentServer(url);

    super(componentServer, {version});
  }
}

function createComponentServer(url: string) {
  return {
    async receive(request: {query: PlainObject; components?: PlainObject[]; version?: number}) {
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
