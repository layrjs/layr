import {ComponentHTTPClient} from '@liaison/component-http-client';
import {ComponentHTTPServer} from '@liaison/component-http-server';

import {Entity, primaryIdentifier, attribute, expose} from '../../..';

const SERVER_PORT = 4444;

describe('HTTP client/server', () => {
  let server;

  beforeAll(async () => {
    const provider = function() {
      class Counter extends Entity {
        @expose({get: true, set: true}) @primaryIdentifier() id;

        @expose({get: true, set: true}) @attribute('number') value = 0;

        @expose({call: true}) increment() {
          this.value++;
        }
      }

      return [Counter];
    };

    server = new ComponentHTTPServer(provider, {port: SERVER_PORT});

    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('Simple entity', async () => {
    const client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}`, {
      baseComponents: [Entity]
    });

    const [Counter] = await client.getComponents();

    const counter = new Counter();

    expect(counter.value).toBe(0);

    await counter.increment();

    expect(counter.value).toBe(1);

    await counter.increment();

    expect(counter.value).toBe(2);
  });
});
