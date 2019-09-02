import {ModelList} from '@liaison/model';
import {createPromisable} from '@liaison/promisable';
import {Trackable} from '@liaison/trackable';

export const DocumentList = documentModelName =>
  class DocumentList extends Trackable(ModelList(documentModelName)) {
    find(options) {
      const Document = this.layer.get(documentModelName);

      this.getTracker().startOperation('finding');

      const promise = (async () => {
        try {
          this.items = await Document.find(options);
        } finally {
          this.getTracker().stopOperation('finding');
        }
      })();

      return createPromisable(this, promise);
    }

    isFinding() {
      return this.getTracker().hasOperation('finding');
    }
  };
