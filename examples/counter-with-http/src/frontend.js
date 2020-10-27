import {ComponentHTTPClient} from '@layr/component-http-client';

(async () => {
  // We create a client that is connected to the backend's server
  const client = new ComponentHTTPClient('http://localhost:3210');

  // We get the backend's Counter component
  const BackendCounter = await client.getComponent();

  // We extends the backend's Counter component so we can override the increment() method
  class Counter extends BackendCounter {
    async increment() {
      await super.increment(); // The backend's `increment()` method is invoked
      console.log(this.value); // Some additional code is executed in the frontend
    }
  }

  // Lastly, we consume the Counter
  const counter = new Counter();
  await counter.increment();
})();
