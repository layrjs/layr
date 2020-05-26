import {Component, attribute, expose} from '@liaison/component';
import fetch from 'cross-fetch';

import {ComponentHTTPServer} from './component-http-server';

const SERVER_PORT = 4444;

describe('ComponentHTTPServer', () => {
  let server: ComponentHTTPServer;

  beforeAll(async () => {
    class Movie extends Component {
      @expose({get: true}) @attribute('number') static limit = 100;
    }

    server = new ComponentHTTPServer(Movie, {port: SERVER_PORT});

    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('Introspecting components', async () => {
    expect(await postJSON({query: {'introspect=>': {'()': []}}})).toStrictEqual({
      result: {
        component: {
          name: 'Movie',
          properties: [
            {
              name: 'limit',
              type: 'Attribute',
              valueType: 'number',
              value: 100,
              exposure: {get: true}
            }
          ]
        }
      }
    });

    await expect(postJSON({query: {'introspect=>': {'()': []}}, version: 1})).rejects.toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );
  });
});

async function postJSON(json: object) {
  const url = `http://localhost:${SERVER_PORT}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(json)
  });

  const result = await response.json();

  if (response.status !== 200) {
    const {message = 'An error occurred while sending query to remote components', ...attributes} =
      result ?? {};

    throw Object.assign(new Error(message), attributes);
  }

  return result;
}
