import {Observable, isObservable} from '@liaison/observable';

export const Trackable = (Base = Object) =>
  class Trackable extends Base {
    getTracker() {
      if (!Object.prototype.hasOwnProperty.call(this, '_tracker')) {
        const tracker = new Tracker();
        if (isObservable(this)) {
          tracker.observe(this);
        }
        Object.defineProperty(this, '_tracker', {value: tracker});
      }

      return this._tracker;
    }
  };

class Tracker extends Observable() {
  constructor() {
    super();
    this._operations = {};
  }

  startOperation(name) {
    this._operations[name] = (this._operations[name] || 0) + 1;
    this.notify();
  }

  stopOperation(name) {
    const count = this._operations[name] || 0;
    if (!(count > 0)) {
      throw new Error(
        `\`startOperation()\` must be called before \`stopOperation()\` (name: '${name}')`
      );
    }
    this._operations[name] = count - 1;
    this.notify();
  }

  hasOperation(name) {
    const count = this._operations[name] || 0;
    return count > 0;
  }
}
