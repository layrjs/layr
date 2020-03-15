import {ComponentClient} from '@liaison/component-client';
import {ComponentServer} from '@liaison/component-server';

import {Entity, primaryIdentifier, attribute, expose} from '../../..';

describe('Client-server', () => {
  test('Simple entity', async () => {
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

    const server = new ComponentServer(provider);

    const client = new ComponentClient(server, {baseComponents: [Entity]});

    const [Counter] = client.getComponents();

    const counter = new Counter();

    expect(counter.value).toBe(0);

    counter.increment();

    expect(counter.value).toBe(1);

    counter.increment();

    expect(counter.value).toBe(2);
  });
});
