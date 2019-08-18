import {EntityModel, FieldMask} from '@layr/model';

import {DocumentNode} from './document-node';

export class Document extends DocumentNode(EntityModel) {
  static async get(ids, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
    if (!Array.isArray(ids)) {
      return (await this.get([ids], {fields, populate, throwIfNotFound}))[0];
    }

    for (const id of ids) {
      this.validateId(id);
    }

    const documents = ids.map(id => this.deserialize({_id: id}));
    await this.load(documents, {fields, reload, populate, throwIfNotFound});
    return documents;
  }

  static async load(documents, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      documents = [documents];
    }

    fields = this.prototype.createFieldMask(fields);

    await this._loadRootDocuments(documents, {fields, reload, throwIfNotFound});

    if (populate) {
      // TODO:
      // await this.populate(documents, {fields, throwIfNotFound});
    }
  }

  static async reload(documents, {fields, populate = true, throwIfNotFound = true} = {}) {
    await this.load(documents, {fields, reload: true, populate, throwIfNotFound});
  }

  static async _loadRootDocuments(documents, {fields, reload, throwIfNotFound}) {
    // TODO:
    // fields = this.filterEntityFields(fields);

    const documentsToLoad = reload ?
      documents :
      documents.filter(document => !document.createFieldMaskForActiveFields().includes(fields));

    if (!documentsToLoad.length) {
      return;
    }

    if (this.hasStore()) {
      await this._loadFromStore(documentsToLoad, {fields, throwIfNotFound});
    } else if (this.hasParentLayer()) {
      // Call load() in the parent layer
      await super.load(documentsToLoad, {
        fields,
        populate: false,
        throwIfNotFound
      });
    } else {
      throw new Error(
        `Couldn't find a store or a parent layer (document: '${this.getRegisteredName()}')`
      );
    }

    for (const loadedDocument of documentsToLoad) {
      await loadedDocument.afterLoad();
    }
  }

  static async _loadFromStore(documents, {fields, throwIfNotFound}) {
    const store = this.getStore();
    const storeId = store.getId();
    let serializedDocuments = documents.map(document =>
      document.serializeReference({target: storeId})
    );
    const serializedFields = fields.serialize();
    serializedDocuments = await store.load(serializedDocuments, {
      fields: serializedFields,
      throwIfNotFound
    });
    documents = serializedDocuments.map(serializedDocument =>
      this.deserialize(serializedDocument, {fields, source: storeId})
    );
  }

  async load({fields, reload, populate = true, throwIfNotFound = true} = {}) {
    await this.constructor.load([this], {fields, reload, populate, throwIfNotFound});
  }

  async reload({fields, populate = true, throwIfNotFound = true} = {}) {
    await this.load({fields, reload: true, populate, throwIfNotFound});
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
      documents = [documents];
    }

    for (const document of documents) {
      await document.beforeSave();
    }

    if (this.hasStore()) {
      await this._saveToStore(documents, {throwIfNotFound, throwIfAlreadyExists});
    } else if (this.hasParentLayer()) {
      // Call save() in the parent layer
      await super.save(documents, {throwIfNotFound, throwIfAlreadyExists});
    } else {
      throw new Error(
        `Couldn't find a store or a parent layer (document: '${this.getRegisteredName()}')`
      );
    }

    for (const document of documents) {
      await document.afterSave();
    }
  }

  static async _saveToStore(documents, {throwIfNotFound, throwIfAlreadyExists}) {
    const store = this.getStore();
    const storeId = store.getId();

    let serializedDocuments = documents.map(document => document.serialize({target: storeId}));

    serializedDocuments = await store.save(serializedDocuments, {
      throwIfNotFound,
      throwIfAlreadyExists
    });

    serializedDocuments.map(serializedDocument =>
      this.deserialize(serializedDocument, {source: storeId})
    );
  }

  async save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
    await this.constructor.save([this], {throwIfNotFound, throwIfAlreadyExists});
  }

  static async delete(documents, {throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      documents = [documents];
    }

    for (const document of documents) {
      await document.beforeDelete();
    }

    if (this.hasStore()) {
      await this._deleteFromStore(documents, {throwIfNotFound});
    } else if (this.hasParentLayer()) {
      // Call delete() in the parent layer
      await super.delete(documents, {throwIfNotFound});
    } else {
      throw new Error(
        `Couldn't find a store or a parent layer (document: '${this.getRegisteredName()}')`
      );
    }

    for (const document of documents) {
      await document.afterDelete();
    }
  }

  static async _deleteFromStore(documents, {throwIfNotFound}) {
    const store = this.getStore();
    const storeId = store.getId();

    const serializedDocuments = documents.map(document =>
      document.serializeReference({target: storeId})
    );

    await store.delete(serializedDocuments, {throwIfNotFound});
  }

  async delete({throwIfNotFound = true} = {}) {
    await this.constructor.delete([this], {throwIfNotFound});
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

  static getStore({throwIfNotFound = true} = {}) {
    const layer = this.getLayer({throwIfNotFound});
    const store = layer?.get('store');
    if (store) {
      return store;
    }
    throw new Error(`Store not found`);
  }

  static hasStore() {
    const store = this.getStore({throwIfNotFound: false});
    return store !== undefined;
  }
}
