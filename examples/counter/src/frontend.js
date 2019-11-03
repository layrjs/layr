import {Layer} from '@liaison/liaison';

import {Counter as BaseCounter} from './shared';
import {backendLayer} from './backend';

class Counter extends BaseCounter {
  async increment() {
    await super.increment(); // Backend's `increment()` method is invoked
    console.log(this.value); // Additional code is executed in the frontend
  }
}

// We register the frontend class into a layer which is a child of the backend
const frontendLayer = new Layer({Counter}, {parent: backendLayer});

// Lastly, we consume it
const counter = new frontendLayer.Counter();
counter.increment();
