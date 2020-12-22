import Koa from 'koa';
import mount from 'koa-mount';
import type {Server} from 'http';
import {serveComponent} from '@layr/component-koa-middleware';
import {ComponentHTTPClient} from '@layr/component-http-client';

import {Counter as BackendCounter} from './counter.fixture';

const SERVER_PORT = 5555;

describe('Koa middleware', () => {
  let server: Server | undefined;

  beforeAll(() => {
    const app = new Koa();

    app.use(mount('/api', serveComponent(BackendCounter)));

    return new Promise<void>((resolve) => {
      server = app.listen(SERVER_PORT, resolve);
    });
  });

  afterAll(() => {
    server?.close();
  });

  test('Simple component', async () => {
    const client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}/api`);

    const Counter = (await client.getComponent()) as typeof BackendCounter;

    let counter = new Counter();

    expect(counter.value).toBe(0);

    await counter.increment();

    expect(counter.value).toBe(1);

    await counter.increment();

    expect(counter.value).toBe(2);
  });
});
