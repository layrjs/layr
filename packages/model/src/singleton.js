import {Model} from './model';

export class Singleton extends Model {
  constructor(object, options) {
    super(object, options);

    this.constructor.$setInstance(this);
  }

  static $getInstance() {
    if (Object.prototype.hasOwnProperty.call(this, '_instance')) {
      return this._instance;
    }
  }

  static $setInstance(instance) {
    this._instance = instance;
  }
}
