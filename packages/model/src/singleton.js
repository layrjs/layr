import {hasOwnProperty} from '@liaison/util';

import {Model} from './model';

export class Singleton extends Model {
  constructor(object, options) {
    super(object, options);

    this.constructor.$setInstance(this);
  }

  static $getInstance() {
    if (hasOwnProperty(this, '__instance')) {
      return this.__instance;
    }
  }

  static $setInstance(instance) {
    this.__instance = instance;
  }
}
