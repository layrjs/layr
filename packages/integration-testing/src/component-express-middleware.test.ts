import express from 'express';
import type {Server} from 'http';
import {serveComponent} from '@layr/component-express-middleware';
import {ComponentHTTPClient} from '@layr/component-http-client';
import fetch from 'cross-fetch';

import {Counter as BackendCounter} from './counter.fixture';

const SERVER_PORT = 6666;

describe('Express middleware', () => {
  let server: Server | undefined;

  beforeAll(() => {
    const app = express();

    app.use('/api', serveComponent(BackendCounter));

    return new Promise<void>((resolve) => {
      server = app.listen(SERVER_PORT, resolve);
    });
  });

  afterAll(() => {
    server?.close();
  });

  test('API-less', async () => {
    const client = new ComponentHTTPClient(`http://localhost:${SERVER_PORT}/api`);

    const Counter = (await client.getComponent()) as typeof BackendCounter;

    let counter = new Counter();

    expect(counter.value).toBe(0);

    await counter.increment();

    expect(counter.value).toBe(1);

    await counter.increment();

    expect(counter.value).toBe(2);
  });

  test('REST API', async () => {
    let response = await fetch(`http://localhost:${SERVER_PORT}/api/ping`);
    let result = await response.json();

    expect(result).toBe('pong');

    response = await fetch(`http://localhost:${SERVER_PORT}/api/echo`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: 'hello'})
    });
    result = await response.json();

    expect(result).toStrictEqual({message: 'hello'});

    response = await fetch(`http://localhost:${SERVER_PORT}/api/echo`, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain'},
      body: 'hello'
    });
    result = await response.json();

    expect(result).toBe('hello');

    response = await fetch(`http://localhost:${SERVER_PORT}/api/echo`, {
      method: 'POST',
      body: Buffer.from([1, 2, 3])
    });
    result = await response.json();

    expect(result).toStrictEqual([1, 2, 3]);
  });
});
