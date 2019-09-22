import {Observable} from '@liaison/observable';

export class Task extends Observable() {
  constructor(name, func) {
    super();
    this._name = name;
    this._func = func;
    this._status = 'created';
    this._promise = undefined;
  }

  getName() {
    return this._name;
  }

  getStatus() {
    return this._status;
  }

  getPromise() {
    return this._promise;
  }

  start() {
    if (!(this._status === 'created' || this._status === 'retried')) {
      throw new Error(`Cannot start a running, completed or failed task`);
    }

    this._status = 'running';
    this.$notify();

    this._promise = this._func().then(
      value => {
        this._status = 'completed';
        this.$notify();
        return value;
      },
      reason => {
        this._status = 'failed';
        this.$notify();
        throw reason;
      }
    );

    return this._promise;
  }

  retry() {
    if (this._status !== 'failed') {
      throw new Error(`Cannot retry a task that has not failed`);
    }

    this._status = 'retried';
    return this.start();
  }
}
