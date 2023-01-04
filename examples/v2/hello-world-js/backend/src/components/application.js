import {Component, method, expose} from '@layr/component';

export class Application extends Component {
  @expose({call: true}) @method() static async getHelloWorld() {
    const results = ['Hello, World!', 'Bonjour le monde !', 'こんにちは世界！'];

    const result = results[Math.round(Math.random() * (results.length - 1))];

    return result;
  }
}
