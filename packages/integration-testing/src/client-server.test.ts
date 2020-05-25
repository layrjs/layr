import {ComponentClient} from '@liaison/component-client';
import {ComponentServer} from '@liaison/component-server';

import {Counter as BackendCounter} from './counter';

describe('Client/server', () => {
  test('Simple component', async () => {
    const server = new ComponentServer(BackendCounter);
    const client = new ComponentClient(server);

    const Counter = client.getComponent() as typeof BackendCounter;

    let counter = new Counter();

    expect(counter.value).toBe(0);

    counter.increment();

    expect(counter.value).toBe(1);

    counter.increment();

    expect(counter.value).toBe(2);
  });
});
