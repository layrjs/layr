import {Component, primaryIdentifier, attribute, method, expose} from '@layr/component';
import {Routable, httpRoute} from '@layr/routable';
import {MemoryNavigator} from '@layr/memory-navigator';

export class Counter extends Routable(Component) {
  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true, set: true}) @attribute('number') value = 0;

  @expose({call: true}) @method() increment() {
    this.value++;
  }

  @httpRoute('GET', '/ping') static ping() {
    return 'pong';
  }

  @httpRoute('POST', '/echo', {
    transformers: {
      input(_, {headers, body}) {
        let data;

        if (Buffer.isBuffer(body)) {
          data = Array.from(body);
        } else if (headers['content-type'] === 'application/json') {
          data = JSON.parse(body);
        } else {
          data = body;
        }

        return {data};
      }
    }
  })
  static echo({data}: {data: any}) {
    return data;
  }
}

const navigator = new MemoryNavigator();

Counter.registerNavigator(navigator);
