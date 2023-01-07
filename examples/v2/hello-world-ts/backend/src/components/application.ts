import {Component, method, expose} from '@layr/component';

export class Application extends Component {
  @expose({call: true}) @method() static async getHelloWorld() {
    const translations = ['Hello, World!', 'Bonjour le monde !', 'こんにちは世界！'];

    const translation = translations[Math.round(Math.random() * (translations.length - 1))];

    return translation;
  }
}
