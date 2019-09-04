import {isObservable} from '@liaison/observable';

import {Tracker} from './tracker';

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
