import {Entity, FieldMask} from '@liaison/model';

export const Storable = (Base = Entity) =>
  class Storable extends Base {
    static async get(ids, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
      if (!Array.isArray(ids)) {
        return (await this.get([ids], {fields, populate, throwIfNotFound}))[0];
      }

      for (const id of ids) {
        this.validateId(id);
      }

      const storables = ids.map(id => this.deserialize({_id: id}));
      await this.load(storables, {fields, reload, populate, throwIfNotFound});
      return storables;
    }

    static async load(storables, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.load([storables], {fields, reload, populate, throwIfNotFound}))[0];
      }

      fields = this.prototype.createFieldMask(fields);

      await this._loadRootStorables(storables, {fields, reload, throwIfNotFound});

      if (populate) {
        // TODO:
        // await this.populate(storables, {fields, throwIfNotFound});
      }

      return storables;
    }

    static async reload(storables, {fields, populate = true, throwIfNotFound = true} = {}) {
      await this.load(storables, {fields, reload: true, populate, throwIfNotFound});
    }

    static async _loadRootStorables(storables, {fields, reload, throwIfNotFound}) {
      // TODO:
      // fields = this.filterEntityFields(fields);

      const storablesToLoad = reload ?
        storables :
        storables.filter(storable => !storable.createFieldMaskForActiveFields().includes(fields));

      if (!storablesToLoad.length) {
        return;
      }

      await this._loadFromStore(storablesToLoad, {fields, throwIfNotFound});

      for (const loadedStorable of storablesToLoad) {
        await loadedStorable.afterLoad({fields});
      }
    }

    static async _loadFromStore(storables, {fields, reload, throwIfNotFound}) {
      fields = this.prototype.createFieldMaskForStorableFields(fields);

      const storablesToLoad = reload ?
        storables :
        storables.filter(storable => !storable.createFieldMaskForActiveFields().includes(fields));

      if (!storablesToLoad.length) {
        return;
      }

      const store = this.getStore();
      const storeId = store.getId();
      let serializedStorables = storables.map(storable =>
        storable.serializeReference({target: storeId})
      );

      const serializedFields = fields.serialize();
      serializedStorables = await store.load(serializedStorables, {
        fields: serializedFields,
        throwIfNotFound
      });

      serializedStorables.map(serializedStorable =>
        this.deserialize(serializedStorable, {fields, source: storeId})
      );
    }

    async load({fields, reload, populate = true, throwIfNotFound = true} = {}) {
      await this.constructor.load([this], {fields, reload, populate, throwIfNotFound});
    }

    async reload({fields, populate = true, throwIfNotFound = true} = {}) {
      await this.load({fields, reload: true, populate, throwIfNotFound});
    }

    static async populate(storables, {fields, throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.populate([storables], {fields, throwIfNotFound}))[0];
      }

      fields = new FieldMask(fields);

      let didLoad;
      do {
        didLoad = await this._populate(storables, {fields, throwIfNotFound});
      } while (didLoad);
    }

    static async _populate(storables, {fields, throwIfNotFound}) {
      const storablesByClass = new Map();

      for (const storable of storables) {
        if (!storable) {
          continue;
        }

        storable.forEachNestedEntityDeep(
          (storable, {fields}) => {
            if (storable.fieldsAreActive(fields)) {
              return;
            }

            const klass = storable.constructor;
            let entry = storablesByClass.get(klass);
            if (!entry) {
              entry = {storables: [], fields: undefined};
              storablesByClass.set(klass, entry);
            }
            if (!entry.storables.includes(storable)) {
              entry.storables.push(storable);
            }
            entry.fields = FieldMask.merge(entry.fields, fields);
          },
          {fields}
        );
      }

      if (!storablesByClass.size) {
        return false;
      }

      for (const [klass, {storables, fields}] of storablesByClass.entries()) {
        await klass.load(storables, {fields, populate: false, throwIfNotFound});
      }

      return true;
    }

    async populate({fields, throwIfNotFound = true} = {}) {
      return (await this.constructor.populate([this], {fields, throwIfNotFound}))[0];
    }

    static async save(storables, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.save([storables], {throwIfNotFound, throwIfAlreadyExists}))[0];
      }

      const fields = this.prototype.createFieldMaskForStorableFields();

      for (const storable of storables) {
        await storable.beforeSave();
      }

      await this._saveToStore(storables, {fields, throwIfNotFound, throwIfAlreadyExists});

      for (const storable of storables) {
        await storable.afterSave();
      }

      return storables;
    }

    static async _saveToStore(storables, {fields, throwIfNotFound, throwIfAlreadyExists}) {
      const store = this.getStore();
      const storeId = store.getId();

      let serializedStorables = storables.map(storable =>
        storable.serialize({target: storeId, fields})
      );

      serializedStorables = await store.save(serializedStorables, {
        throwIfNotFound,
        throwIfAlreadyExists
      });

      serializedStorables.map(serializedStorable =>
        this.deserialize(serializedStorable, {source: storeId})
      );
    }

    async save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      await this.constructor.save([this], {throwIfNotFound, throwIfAlreadyExists});
    }

    async update(changes, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      this.assign(changes);

      await this.save({throwIfNotFound, throwIfAlreadyExists});
    }

    static async delete(storables, {throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.delete([storables], {throwIfNotFound}))[0];
      }

      for (const storable of storables) {
        await storable.beforeDelete();
      }

      await this._deleteFromStore(storables, {throwIfNotFound});

      for (const storable of storables) {
        await storable.afterDelete();
      }

      return storables;
    }

    static async _deleteFromStore(storables, {throwIfNotFound}) {
      const store = this.getStore();
      const storeId = store.getId();

      const serializedStorables = storables.map(storable =>
        storable.serializeReference({target: storeId})
      );

      await store.delete(serializedStorables, {throwIfNotFound});
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
      populate = true
      // throwIfNotFound = true
    } = {}) {
      fields = this.prototype.createFieldMask(fields);

      // TODO:
      // fields = this.filterEntityFields(fields);

      const storables = await this._findInStore({filter, sort, skip, limit, fields});

      if (populate) {
        // await this.populate(storables, {fields, throwIfNotFound});
      }

      for (const storable of storables) {
        await storable.afterLoad({fields});
      }

      return storables;
    }

    static async _findInStore({filter, sort, skip, limit, fields}) {
      fields = this.prototype.createFieldMaskForStorableFields(fields);

      const store = this.getStore();
      const storeId = store.getId();

      const serializedFields = fields.serialize();
      const serializedStorables = await store.find(
        {_type: this.getRegisteredName(), ...filter},
        {sort, skip, limit, fields: serializedFields}
      );

      const storables = serializedStorables.map(serializedStorable =>
        this.deserialize(serializedStorable, {fields, source: storeId})
      );

      return storables;
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

    // === Hooks ===

    async afterLoad() {
      for (const substorable of this.getSubstorables()) {
        await substorable.afterLoad();
      }
    }

    async beforeSave() {
      for (const substorable of this.getSubstorables()) {
        await substorable.beforeSave();
      }
    }

    async afterSave() {
      for (const substorable of this.getSubstorables()) {
        await substorable.afterSave();
      }
    }

    async beforeDelete() {
      for (const substorable of this.getSubstorables()) {
        await substorable.beforeDelete();
      }
    }

    async afterDelete() {
      for (const substorable of this.getSubstorables()) {
        await substorable.afterDelete();
      }
    }

    getSubstorables() {
      const filter = function (field) {
        return typeof field.getScalar().getModel()?.isSubstorable === 'function';
      };
      return this.getFieldValues({filter});
    }

    // === Storable fields ===

    addStorableField(name) {
      if (!this._storableFields) {
        this._storableFields = new Map();
      } else if (!Object.prototype.hasOwnProperty.call(this, '_storableFields')) {
        this._storableFields = new Map(this._storableFields);
      }
      this._storableFields.set(name, {name});
    }

    createFieldMaskForStorableFields(fields = true) {
      return this.createFieldMask(fields, {
        filter: field => {
          return this._storableFields?.has(field.getName());
        }
      });
    }
  };

// === Decorators ===

export function storable() {
  return function (target, name, descriptor) {
    target.addStorableField(name);
    return descriptor;
  };
}
