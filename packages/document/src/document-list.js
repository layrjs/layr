import {ModelList} from '@liaison/model';
import {createPromisable} from '@liaison/promisable';
import {Trackable, Task} from '@liaison/trackable';

export const DocumentList = documentModelName =>
  class DocumentList extends Trackable(ModelList(documentModelName)) {
    find(options) {
      const Document = this.layer.get(documentModelName);

      const task = new Task('finding', async () => {
        this.items = await Document.find(options);
      });

      this.getTracker().addTask(task);

      const promise = task.start();

      return createPromisable(this, promise);
    }

    isFinding() {
      return this.getTracker().hasRunningTask('finding');
    }

    findingFailed() {
      return this.getTracker().hasFailedTask('finding');
    }

    retryFinding() {
      return this.getTracker().retryTask('finding');
    }
  };
