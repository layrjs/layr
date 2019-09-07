import {Model} from './model';

export class Singleton extends Model {
  constructor(object, options) {
    super(object, options);

    this.constructor.setInstance(this);
  }

  static getInstance() {
    return this._instance;
  }

  static setInstance(instance) {
    this._instance = instance;
  }
}
