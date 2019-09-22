import {Observable} from '@liaison/observable';

export class Tracker extends Observable() {
  constructor() {
    super();
    this._tasks = [];
  }

  addTask(task) {
    this._tasks.push(task);
    task.$observe(this);
  }

  findTask(name, status) {
    for (const task of this._tasks) {
      if (name !== undefined && task.getName() !== name) {
        continue;
      }

      if (status !== undefined && task.getStatus() !== status) {
        continue;
      }

      return task;
    }
  }

  retryTask(name) {
    const task = this.findTask(name, 'failed');
    return task.retry();
  }

  hasTask(name, status) {
    return this.findTask(name, status) !== undefined;
  }

  hasRunningTask(name) {
    return this.hasTask(name, 'running');
  }

  hasFailedTask(name) {
    return this.hasTask(name, 'failed');
  }

  hasCompletedTask(name) {
    return this.hasTask(name, 'completed');
  }
}
