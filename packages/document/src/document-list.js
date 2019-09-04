import {ModelList} from '@liaison/model';

export const DocumentList = documentModelName =>
  class DocumentList extends ModelList(documentModelName) {
    async find(options) {
      const Document = this.layer.get(documentModelName);

      this.items = await Document.find(options);
    }
  };
