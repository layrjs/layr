import {ComponentClient} from '@liaison/component-client';
import {ComponentServer} from '@liaison/component-server';

import {Component, expose} from '../../..';

describe('Client/server', () => {
  test('Using class properties', async () => {
    const server = (() => {
      class Counter extends Component {
        @expose({get: true, set: true}) static value = 0;

        @expose({call: true}) static increment() {
          this.value++;
        }
      }

      return new ComponentServer([Counter]);
    })();

    const client = new ComponentClient(server, {baseComponents: [Component]});

    const [Counter] = client.getComponents();

    expect(Counter.value).toBe(0);

    Counter.increment();

    expect(Counter.value).toBe(1);

    Counter.increment();

    expect(Counter.value).toBe(2);
  });

  test('Using instance properties', async () => {
    const server = (() => {
      class Counter extends Component {
        @expose({get: true, set: true}) value = 0;

        @expose({call: true}) increment() {
          this.value++;

          return this;
        }
      }

      return new ComponentServer([Counter]);
    })();

    const client = new ComponentClient(server, {baseComponents: [Component]});

    const [Counter] = client.getComponents();

    let counter = new Counter();

    expect(counter.value).toBe(0);

    counter = counter.increment();

    expect(counter.value).toBe(1);

    counter = counter.increment();

    expect(counter.value).toBe(2);
  });
});
