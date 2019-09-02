import {EntityModel, FieldMask} from '@liaison/model';
import {expose} from '@liaison/layer';
import {createPromisable} from '@liaison/promisable';
import {Trackable} from '@liaison/trackable';

import {DocumentNode} from './document-node';

export class Document extends DocumentNode(Trackable(EntityModel)) {
  static get(ids, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
    if (!Array.isArray(ids)) {
      return this.get([ids], {fields, populate, throwIfNotFound})[0];
    }

    for (const id of ids) {
      this.validateId(id);
    }

    let documents = ids.map(id => this.deserialize({_id: id}));

    documents = this.load(documents, {fields, reload, populate, throwIfNotFound});

    return documents;
  }

  @expose()
  static load(documents, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return this.load([documents], {fields, reload, populate, throwIfNotFound})[0];
    }

    fields = this.prototype.createFieldMask(fields);

    documents = this._loadRootDocuments(documents, {fields, reload, throwIfNotFound});

    if (populate) {
      // TODO:
      // await this.populate(documents, {fields, throwIfNotFound});
    }

    return documents;
  }

  static reload(documents, {fields, populate = true, throwIfNotFound = true} = {}) {
    return this.load(documents, {fields, reload: true, populate, throwIfNotFound});
  }

  static _loadRootDocuments(documents, {fields, reload, throwIfNotFound}) {
    // TODO:
    // fields = this.filterEntityFields(fields);

    const documentsToLoad = reload ?
      documents :
      documents.filter(document => !document.createFieldMaskForActiveFields().includes(fields));

    if (!documentsToLoad.length) {
      return documents;
    }

    for (const documentToLoad of documentsToLoad) {
      documentToLoad.getTracker().startOperation('loading');
    }

    const promise = (async () => {
      try {
        if (this.hasStore()) {
          await this._loadFromStore(documentsToLoad, {fields, throwIfNotFound});
        } else if (this.hasParentLayer()) {
          // Call load() in the parent layer
          await super.load(documentsToLoad, {
            fields,
            reload,
            populate: false,
            throwIfNotFound
          });
        } else {
          throw new Error(
            `Couldn't find a store or a parent layer (document: '${this.getRegisteredName()}')`
          );
        }

        const loadedDocuments = documentsToLoad;

        for (const loadedDocument of loadedDocuments) {
          await loadedDocument.afterLoad();
        }
      } finally {
        for (const documentToLoad of documentsToLoad) {
          documentToLoad.getTracker().stopOperation('loading');
        }
      }
    })();

    documents = documents.map(document =>
      documentsToLoad.includes(document) ? createPromisable(document, promise) : document
    );

    documents = createPromisable(documents, promise);

    return documents;
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

  load({fields, reload, populate = true, throwIfNotFound = true} = {}) {
    return this.constructor.load(this, {fields, reload, populate, throwIfNotFound});
  }

  reload({fields, populate = true, throwIfNotFound = true} = {}) {
    return this.load({fields, reload: true, populate, throwIfNotFound});
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

  isLoading() {
    return this.getTracker().hasOperation('loading');
  }

  @expose()
  static save(documents, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
    if (!Array.isArray(documents)) {
      return this.save([documents], {throwIfNotFound, throwIfAlreadyExists})[0];
    }

    for (const document of documents) {
      document.getTracker().startOperation('saving');
    }

    const promise = (async () => {
      try {
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
      } finally {
        for (const document of documents) {
          document.getTracker().stopOperation('saving');
        }
      }
    })();

    documents = documents.map(document => createPromisable(document, promise));

    documents = createPromisable(documents, promise);

    return documents;
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

  save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
    return this.constructor.save(this, {throwIfNotFound, throwIfAlreadyExists});
  }

  isSaving() {
    return this.getTracker().hasOperation('saving');
  }

  @expose()
  static delete(documents, {throwIfNotFound = true} = {}) {
    if (!Array.isArray(documents)) {
      return this.delete([documents], {throwIfNotFound})[0];
    }

    for (const document of documents) {
      document.getTracker().startOperation('deleting');
    }

    const promise = (async () => {
      try {
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
      } finally {
        for (const document of documents) {
          document.getTracker().stopOperation('deleting');
        }
      }
    })();

    documents = documents.map(document => createPromisable(document, promise));

    documents = createPromisable(documents, promise);

    return documents;
  }

  static async _deleteFromStore(documents, {throwIfNotFound}) {
    const store = this.getStore();
    const storeId = store.getId();

    const serializedDocuments = documents.map(document =>
      document.serializeReference({target: storeId})
    );

    await store.delete(serializedDocuments, {throwIfNotFound});
  }

  delete({throwIfNotFound = true} = {}) {
    return this.constructor.delete(this, {throwIfNotFound});
  }

  isDeleting() {
    return this.getTracker().hasOperation('deleting');
  }

  @expose()
  static find({filter, sort, skip, limit, fields, populate = true, throwIfNotFound = true} = {}) {
    fields = this.prototype.createFieldMask(fields);

    // TODO:
    // fields = this.filterEntityFields(fields);

    const promise = (async () => {
      let foundDocuments;

      if (this.hasStore()) {
        foundDocuments = await this._findInStore({filter, sort, skip, limit, fields});
      } else if (this.hasParentLayer()) {
        // Call find() in the parent layer
        foundDocuments = await super.find({
          filter,
          sort,
          skip,
          limit,
          fields,
          populate: false,
          throwIfNotFound
        });
      } else {
        throw new Error(
          `Couldn't find a store or a parent layer (document: '${this.getRegisteredName()}')`
        );
      }

      if (populate) {
        // await this.populate(foundDocuments, {fields, throwIfNotFound});
      }

      for (const foundDocument of foundDocuments) {
        await foundDocument.afterLoad();
      }

      documents.push(...foundDocuments);
    })();

    const documents = createPromisable([], promise);

    return documents;
  }

  static async _findInStore({filter, sort, skip, limit, fields}) {
    const store = this.getStore();
    const storeId = store.getId();
    const serializedFields = fields.serialize();
    const serializedDocuments = await store.find(
      {_type: this.getRegisteredName(), ...filter},
      {sort, skip, limit, fields: serializedFields}
    );
    const documents = serializedDocuments.map(serializedDocument =>
      this.deserialize(serializedDocument, {fields, source: storeId})
    );
    return documents;
  }

  static getStore({throwIfNotFound = true} = {}) {
    const layer = this.getLayer({throwIfNotFound});
    const store = layer?.get('store', {throwIfNotFound});
    if (store !== undefined) {
      return store;
    }
    if (throwIfNotFound) {
      throw new Error(`Store not found`);
    }
  }

  static hasStore() {
    const store = this.getStore({throwIfNotFound: false});
    return store !== undefined;
  }
}
