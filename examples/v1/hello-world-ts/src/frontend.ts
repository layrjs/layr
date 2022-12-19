import {ComponentHTTPClient} from '@layr/component-http-client';

import type {Greeter as GreeterType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const BackendGreeter = (await client.getComponent()) as typeof GreeterType;

  class Greeter extends BackendGreeter {
    async hello() {
      return (await super.hello()).toUpperCase();
    }
  }

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
