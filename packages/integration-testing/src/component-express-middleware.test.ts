import express from 'express';
import type {Server} from 'http';
import {serveComponent} from '@liaison/component-express-middleware';
import {ComponentHTTPClient} from '@liaison/component-http-client';

import {Counter as BackendCounter} from './counter.fixture';

const SERVER_PORT = 6666;

describe('Express middleware', () => {
  let server: Server | undefined;

  beforeAll(() => {
    const app = express();

    app.use('/api', serveComponent(BackendCounter));

    return new Promise((resolve) => {
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
