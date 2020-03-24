import {ComponentHTTPClient} from '@liaison/component-http-client';
import {ComponentServer} from '@liaison/component-server';
import {ComponentHTTPServer} from '@liaison/component-http-server';

import {Component, expose} from '../../..';

const SERVER_PORT = 4444;

describe('HTTP client/server', () => {
  let server;

  beforeAll(async () => {
    const provider = function() {
      class Counter extends Component {
        @expose({get: true, set: true}) static value = 0;

        @expose({call: true}) static increment() {
          this.value++;
        }
      }

      return [Counter];
    };

    server = new ComponentHTTPServer(new ComponentServer(provider), {port: SERVER_PORT});

    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('Simple component class', async () => {
    const client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}`, {
      baseComponents: [Component]
    });

    const [Counter] = await client.getComponents();

    expect(Counter.value).toBe(0);

    await Counter.increment();

    expect(Counter.value).toBe(1);

    await Counter.increment();

    expect(Counter.value).toBe(2);
  });
});
