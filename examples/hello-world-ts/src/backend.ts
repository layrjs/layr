import {Component, attribute, method, expose} from '@liaison/component';
import {ComponentHTTPServer} from '@liaison/component-http-server';

export class Greeter extends Component {
  @expose({set: true}) @attribute('string') name = 'World';

  @expose({call: true}) @method() async hello() {
    return `Hello, ${this.name}!`;
  }
}

const server = new ComponentHTTPServer(Greeter, {port: 3210});

server.start();
