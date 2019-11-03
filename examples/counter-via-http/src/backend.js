import {Layer, field, method} from '@liaison/liaison';
import {LayerHTTPServer} from '@liaison/layer-http-server';

import {Counter as BaseCounter} from './shared';

class Counter extends BaseCounter {
  // The counter's value is exposed to the frontend
  @field({expose: {get: true, set: true}}) value;

  // And the "business logic" is exposed as well
  @method({expose: {call: true}}) increment() {
    this.value++;
  }
}

// We register the backend class into a layer
const backendLayer = new Layer({Counter});

(async () => {
  // We serve the backend layer through HTTP
  const server = new LayerHTTPServer(() => backendLayer.$fork(), {port: 3333});
  await server.$start();
})();
