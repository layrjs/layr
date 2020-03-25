import {Component, attribute, expose} from '@liaison/component';
import {Layer} from '@liaison/layer';
import {LayerServer} from '@liaison/layer-server';
import fetch from 'cross-fetch';

import {LayerHTTPServer} from '../../..';

const SERVER_PORT = 4444;

describe('LayerHTTPServer', () => {
  let server;

  beforeAll(async () => {
    class Movie extends Component {
      @expose({get: true}) @attribute() static limit = 100;
    }

    const layer = new Layer([Movie], {name: 'backend'});

    server = new LayerHTTPServer(new LayerServer(layer), {port: SERVER_PORT});

    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('Introspecting components', async () => {
    expect(await postJSON({query: {'introspect=>': {'()': []}}})).toStrictEqual({
      name: 'backend',
      components: [
        {
          name: 'Movie',
          type: 'Component',
          properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}]
        }
      ]
    });

    await expect(postJSON({query: {'introspect=>': {'()': []}}, version: 1})).rejects.toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );
  });
});

async function postJSON(json) {
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
