import {ComponentClient} from '@liaison/component-client';

import {server} from './backend';

// We create a client that is connected to the backend's server
const client = new ComponentClient(server);

// We get the backend's Counter component
const BackendCounter = client.getComponent();

// We extends the backend's Counter component so we can override the increment() method
class Counter extends BackendCounter {
  increment() {
    super.increment(); // The backend's `increment()` method is invoked
    console.log(this.value); // Some additional code is executed in the frontend
  }
}

// Lastly, we consume the Counter
const counter = new Counter();
counter.increment();
