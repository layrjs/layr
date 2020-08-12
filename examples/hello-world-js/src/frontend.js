import {ComponentHTTPClient} from '@liaison/component-http-client';

(async () => {
  const client = new ComponentHTTPClient('http://localhost:3210');

  const BackendGreeter = await client.getComponent();

  class Greeter extends BackendGreeter {
    async hello() {
      return (await super.hello()).toUpperCase();
    }
  }

  const greeter = new Greeter({name: 'Steve'});

  console.log(await greeter.hello());
})();
