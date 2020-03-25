import {ComponentHTTPClient} from '@liaison/component-http-client';
import {ComponentServer} from '@liaison/component-server';
import {ComponentHTTPServer} from '@liaison/component-http-server';

import {Entity, primaryIdentifier, attribute, expose} from '../../..';

const SERVER_PORT = 4444;

describe('HTTP client/server', () => {
  let server;

  beforeAll(async () => {
    class Counter extends Entity {
      @expose({get: true, set: true}) @primaryIdentifier() id;

      @expose({get: true, set: true}) @attribute('number') value = 0;

      @expose({call: true}) increment() {
        this.value++;
      }
    }

    server = new ComponentHTTPServer(new ComponentServer([Counter]), {port: SERVER_PORT});

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
