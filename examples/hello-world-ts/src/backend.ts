import {Component, attribute, method, expose} from '@layr/component';
import {ComponentHTTPServer} from '@layr/component-http-server';

export class Greeter extends Component {
  @expose({set: true}) @attribute('string') name = 'World';

  @expose({call: true}) @method() async hello() {
    return `Hello, ${this.name}!`;
  }
}

const server = new ComponentHTTPServer(Greeter, {port: 3210});

server.start();
