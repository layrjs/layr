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

    const documentFields = this.filterReferenceFields(fields);
    const loadedDocuments = await this._load(incompleteDocuments, {
      fields: documentFields,
      throwIfNotFound
    });
    for (const loadedDocument of loadedDocuments) {
      if (loadedDocument) {
        await loadedDocument.afterLoad();
      }
    }

    documents = documents.map(document => {
      if (incompleteDocuments.some(incompleteDocument => incompleteDocument.id === document.id)) {
        if (!loadedDocuments.some(loadedDocument => loadedDocument?.id === document.id)) {
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

  async save() {
    await this.beforeSave();
    await this._save();
    await this.afterSave();
    return this;
  }

  async delete() {
    await this.beforeDelete();
    await this._delete();
    this.release();
    await this.afterDelete();
  }

  static async find({filter, sort, skip, limit, fields} = {}) {
    fields = new FieldMask(fields);
    const documentFields = this.filterReferenceFields(fields);
    const documents = await this._find({filter, sort, skip, limit, fields: documentFields});
    for (const document of documents) {
      await document.afterLoad();
    }
    return documents;
  }

  static filterReferenceFields(fields) {
    // TODO
    return fields;
  }

  isOfType(name) {
    return name === 'Document' ? true : super.isOfType(name); // Optimization
  }
}
