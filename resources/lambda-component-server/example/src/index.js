import {Component, method, expose} from '@liaison/component';
import {ComponentServer} from '@liaison/component-server';

// time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"introspect=>": {"()": []}}, "version": 1}' https://lambda-component-server-example.liaison.dev

// time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"<=": {"__component": "Clock"}, "getTime=>": {"()": []}}, "version": 1}' https://lambda-component-server-example.liaison.dev

// time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"<=": {"__component": "Clock"}, "getSecret=>": {"()": []}}, "version": 1}' https://lambda-component-server-example.liaison.dev

class Clock extends Component {
  @expose({call: true}) static getTime() {
    return new Date();
  }

  @expose({call: true}) static getSecret() {
    return process.env.SECRET;
  }
}

class UnexposedComponent extends Component {
  @method() static unexposedMethod() {
    return 'Hi';
  }
}

const componentServer = new ComponentServer(() => [Clock.fork(), UnexposedComponent.fork()], {
  version: 1
});

export default componentServer;
