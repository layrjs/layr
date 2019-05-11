import {EntityModel} from '@layr/model';
import {FieldMask} from '@layr/util';

import {BaseDocument} from './base-document';

export class AbstractDocument extends BaseDocument(EntityModel) {
  static async get(ids, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
    if (!Array.isArray(ids)) {
      return (await this.get([ids], {fields, populate, throwIfNotFound}))[0];
    }

    for (const id of ids) {
      this.validateId(id);
    }

    let documents = ids.map(id => this.deserialize({_id: id}));
    documents = await this.load(documents, {fields, reload, populate, throwIfNotFound});
    return documents;
  }

  static async load(documents, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return (await this.load([documents], {fields, reload, populate, throwIfNotFound}))[0];
    }

    fields = new FieldMask(fields);

    documents = await this._loadRootDocuments(documents, {fields, reload, throwIfNotFound});

    if (populate) {
      await this.populate(documents, {fields, throwIfNotFound});
    }

    return documents;
  }

  static async reload(documents, {fields, populate = true, throwIfNotFound = true} = {}) {
    return await this.load(documents, {fields, reload: true, populate, throwIfNotFound});
  }

  static async _loadRootDocuments(documents, {fields, reload, throwIfNotFound}) {
    fields = this.filterEntityFields(fields);

    const documentsToLoad = reload ?
      documents :
      documents.filter(document => !document.fieldsAreActive(fields));

    if (!documentsToLoad.length) {
      return documents;
    }

    let loadedDocuments = await this._load(documentsToLoad, {fields, throwIfNotFound});

    loadedDocuments = loadedDocuments.filter(loadedDocument => loadedDocument);

    for (const loadedDocument of loadedDocuments) {
      await loadedDocument.afterLoad();
    }

    documents = documents.map(document => {
      if (documentsToLoad.some(incompleteDocument => incompleteDocument._id === document._id)) {
        if (!loadedDocuments.some(loadedDocument => loadedDocument._id === document._id)) {
          return undefined;
        }
      }
      return document;
    });

    return documents;
  }

  async load({fields, reload, populate = true, throwIfNotFound = true} = {}) {
    return (await this.constructor.load([this], {fields, reload, populate, throwIfNotFound}))[0];
  }

  async reload({fields, populate = true, throwIfNotFound = true} = {}) {
    return await this.load({fields, reload: true, populate, throwIfNotFound});
  }

  static async populate(documents, {fields, throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return (await this.populate([documents], {fields, throwIfNotFound}))[0];
    }

    fields = new FieldMask(fields);

    let didLoad;
    do {
      didLoad = await this._populate(documents, {fields, throwIfNotFound});
    } while (didLoad);
  }

  static async _populate(documents, {fields, throwIfNotFound}) {
    const documentsByClass = new Map();

    for (const document of documents) {
      if (!document) {
        continue;
      }

      document.forEachNestedEntityDeep(
        (document, {fields}) => {
          if (document.fieldsAreActive(fields)) {
            return;
          }

          const klass = document.constructor;
          let entry = documentsByClass.get(klass);
          if (!entry) {
            entry = {documents: [], fields: undefined};
            documentsByClass.set(klass, entry);
          }
          if (!entry.documents.includes(document)) {
            entry.documents.push(document);
          }
          entry.fields = FieldMask.merge(entry.fields, fields);
        },
        {fields}
      );
    }

    if (!documentsByClass.size) {
      return false;
    }

    for (const [klass, {documents, fields}] of documentsByClass.entries()) {
      await klass.load(documents, {fields, populate: false, throwIfNotFound});
    }

    return true;
  }

  async populate({fields, throwIfNotFound = true} = {}) {
    return (await this.constructor.populate([this], {fields, throwIfNotFound}))[0];
  }

  static async save(documents, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
    if (!Array.isArray(documents)) {
      return (await this.save([documents], {throwIfNotFound, throwIfAlreadyExists}))[0];
    }

    for (const document of documents) {
      await document.beforeSave();
    }

    documents = await this._save(documents, {throwIfNotFound, throwIfAlreadyExists});

    for (const document of documents) {
      await document.afterSave();
    }

    return documents;
  }

  async save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
    return (await this.constructor.save([this], {throwIfNotFound, throwIfAlreadyExists}))[0];
  }

  static async delete(documents, {throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return (await this.delete([documents], {throwIfNotFound}))[0];
    }

    for (const document of documents) {
      await document.beforeDelete();
    }

    documents = await this._delete(documents, {throwIfNotFound});

    for (const document of documents) {
      if (document) {
        await document.afterDelete();
      }
    }

    for (const document of documents) {
      if (document) {
        document.release();
      }
    }

    return documents;
  }

  async delete({throwIfNotFound = true} = {}) {
    return (await this.constructor.delete([this], {throwIfNotFound}))[0];
  }

  static async find({
    filter,
    sort,
    skip,
    limit,
    fields,
    populate = true,
    throwIfNotFound = true
  } = {}) {
    fields = new FieldMask(fields);

    const documentFields = this.filterEntityFields(fields);
    const documents = await this._find({filter, sort, skip, limit, fields: documentFields});

    if (populate) {
      await this.populate(documents, {fields, throwIfNotFound});
    }

    for (const document of documents) {
      await document.afterLoad();
    }

    return documents;
  }

  isOfType(name) {
    return name === 'AbstractDocument' ? true : super.isOfType(name); // Optimization
  }
}
