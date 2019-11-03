import {Layer} from '@liaison/liaison';
import {LayerHTTPClient} from '@liaison/layer-http-client';

import {Counter as BaseCounter} from './shared';

class Counter extends BaseCounter {
  async increment() {
    await super.increment(); // Backend's `increment()` method is invoked
    console.log(this.value); // Additional code is executed in the frontend
  }
}

(async () => {
  // We connect to the backend layer
  const client = new LayerHTTPClient('http://localhost:3333');
  const backendLayer = await client.$getLayer();

  // We register the frontend class into a layer which is a child of the backend
  const frontendLayer = new Layer({Counter}, {parent: backendLayer});

  // Lastly, we consume it
  const counter = new frontendLayer.Counter();
  await counter.increment();
})();
