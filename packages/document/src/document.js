import {Entity} from '@storable/model';
import {FieldMask} from '@storable/util';

import {BaseDocument} from './base-document';

export class Document extends BaseDocument(Entity) {
  static async get(ids, {fields, throwIfNotFound = true} = {}) {
    if (!Array.isArray(ids)) {
      return (await this.get([ids], {fields, throwIfNotFound}))[0];
    }

    for (const id of ids) {
      this.validateId(id);
    }

    let documents = ids.map(id => this.deserialize({_id: id}));
    documents = await this.load(documents, {fields, throwIfNotFound});
    return documents;
  }

  static async load(documents, {fields, throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return (await this.load([documents], {fields, throwIfNotFound}))[0];
    }

    fields = new FieldMask(fields);

    const incompleteDocuments = documents.filter(document => !document.fieldsAreActive(fields));

    if (!incompleteDocuments.length) {
      return documents;
    }

    const loadedDocuments = await this._load(incompleteDocuments, {fields, throwIfNotFound});

    for (const loadedDocument of loadedDocuments) {
      if (loadedDocument) {
        await loadedDocument.afterLoad();
      }
    }

    documents = documents.map(document => {
      if (incompleteDocuments.some(incompleteDocument => incompleteDocument._id === document._id)) {
        if (!loadedDocuments.some(loadedDocument => loadedDocument?._id === document._id)) {
          return undefined;
        }
      }
      return document;
    });

    return documents;
  }

  async load({fields, throwIfNotFound = true} = {}) {
    return (await this.constructor.load([this], {fields, throwIfNotFound}))[0];
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

  static async find({filter, sort, skip, limit, fields} = {}) {
    fields = new FieldMask(fields);
    const documents = await this._find({filter, sort, skip, limit, fields});
    for (const document of documents) {
      await document.afterLoad();
    }
    return documents;
  }

  isOfType(name) {
    return name === 'Document' ? true : super.isOfType(name); // Optimization
  }
}
