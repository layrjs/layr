export const DocumentNode = Parent =>
  class extends Parent {
    async afterLoad() {
      for (const subdocument of this.getSubdocuments()) {
        await subdocument.afterLoad();
      }
    }

    async beforeSave() {
      for (const subdocument of this.getSubdocuments()) {
        await subdocument.beforeSave();
      }
    }

    async afterSave() {
      for (const subdocument of this.getSubdocuments()) {
        await subdocument.afterSave();
      }
    }

    async beforeDelete() {
      for (const subdocument of this.getSubdocuments()) {
        await subdocument.beforeDelete();
      }
    }

    async afterDelete() {
      for (const subdocument of this.getSubdocuments()) {
        await subdocument.afterDelete();
      }
    }

    getSubdocuments() {
      const filter = function (field) {
        return typeof field.getScalar().getModel()?.isSubdocument === 'function';
      };
      return this.getFieldValues({filter});
    }
  };
