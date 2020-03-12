import {Component, attribute, expose} from '@liaison/component';
import fetch from 'cross-fetch';

import {ComponentHTTPServer} from '../../..';

const SERVER_PORT = 4444;

describe('ComponentHTTPServer', () => {
  let server;

  beforeAll(async () => {
    const provider = function() {
      class Movie extends Component {
        @expose({get: true}) @attribute() static limit = 100;
      }

      return [Movie];
    };

    server = new ComponentHTTPServer(provider, {port: SERVER_PORT});

    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('Introspecting components', async () => {
    expect(await postJSON({query: {'introspect=>': {'()': []}}})).toStrictEqual({
      components: [
        {
          name: 'Movie',
          type: 'Component',
          properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}]
        }
      ]
    });
  });
});

async function postJSON(json) {
  const url = `http://localhost:${SERVER_PORT}`;

  const fetchResponse = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(json)
  });

  if (fetchResponse.status !== 200) {
    throw new Error('An error occurred while posting JSON');
  }

  const response = await fetchResponse.json();

  return response;
}
