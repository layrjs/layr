import {ComponentHTTPClient} from '@liaison/component-http-client';
import {ComponentHTTPServer} from '@liaison/component-http-server';

import {Counter as BackendCounter} from './counter.fixture';

const SERVER_PORT = 4444;

describe('HTTP client/server', () => {
  let server: ComponentHTTPServer;

  beforeAll(async () => {
    server = new ComponentHTTPServer(BackendCounter, {port: SERVER_PORT});
    await server.start();
  });

  afterAll(async () => {
    await server?.stop();
  });

  test('Simple component', async () => {
    const client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}`);

    const Counter = (await client.getComponent()) as typeof BackendCounter;

    let counter = new Counter();

    expect(counter.value).toBe(0);

    await counter.increment();

    expect(counter.value).toBe(1);

    await counter.increment();

    expect(counter.value).toBe(2);
  });
});
