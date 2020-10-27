import {Component, primaryIdentifier, attribute, method, expose} from '@layr/component';

export class Counter extends Component {
  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true, set: true}) @attribute('number') value = 0;

  @expose({call: true}) @method() async increment() {
    this.value++;
  }
}
