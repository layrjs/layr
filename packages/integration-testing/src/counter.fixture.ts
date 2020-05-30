import {Component, primaryIdentifier, attribute, method, expose} from '@liaison/component';

export class Counter extends Component {
  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true, set: true}) @attribute('number') value = 0;

  @expose({call: true}) @method() increment() {
    this.value++;
  }
}
