import {ComponentHTTPClient} from '@liaison/component-http-client';

import type {Greeter as GreeterType} from './backend';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const Greeter = (await client.getComponent()) as typeof GreeterType;

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
