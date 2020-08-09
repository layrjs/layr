import {ComponentClient, ComponentClientOptions} from '@liaison/component-client';
import fetch from 'cross-fetch';
import type {PlainObject} from 'core-helpers';

export type ComponentHTTPClientOptions = ComponentClientOptions;

export class ComponentHTTPClient extends ComponentClient {
  constructor(url: string, options: ComponentHTTPClientOptions = {}) {
    const componentServer = createComponentServer(url);

    super(componentServer, {...options, batchable: true});
  }
}

function createComponentServer(url: string) {
  return {
    async receive(request: {query: PlainObject; components?: PlainObject[]; version?: number}) {
      const {query, components, version} = request;

      const json = {query, components, version};

      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(json)
      });

      const response = await fetchResponse.json();

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
