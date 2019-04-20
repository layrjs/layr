import {callWithOneOrMany} from '@storable/util';

export const BaseDocument = Parent =>
  class extends Parent {
    async afterLoad() {
      await this.forEachSubdocumentAsync(async document => await document.afterLoad());
    }

    async beforeSave() {
      await this.forEachSubdocumentAsync(async document => await document.beforeSave());
    }

    async afterSave() {
      this.markAsNotNew();
      await this.forEachSubdocumentAsync(async document => await document.afterSave());
    }

    async beforeDelete() {
      await this.forEachSubdocumentAsync(async document => await document.beforeDelete());
    }

    async afterDelete() {
      await this.forEachSubdocumentAsync(async document => await document.afterDelete());
    }

    async forEachSubdocumentAsync(func) {
      const subdocuments = [];
      this.forEachField(field => {
        const value = this[field.name];
        if (value !== undefined) {
          callWithOneOrMany(value, value => {
            if (value?.isOfType && value.isOfType('Subdocument')) {
              subdocuments.push(value);
            }
          });
        }
      });

      for (const subdocument of subdocuments) {
        await func(subdocument);
      }
    }
  };
