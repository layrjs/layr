import {Entity, FieldMask} from '@liaison/model';
import {hasOwnProperty} from '@liaison/util';

import {Cache} from './cache';

// TODO: Storable.getBy({name: value}, options) or just Storable.get({name: value}, options)

const DEFAULT_CACHE_SIZE = 1000;

export const Storable = (Base = Entity) =>
  class Storable extends Base {
    static async $open() {
      this.__cache = new Cache({size: DEFAULT_CACHE_SIZE});
    }

    static async $close() {
      this.__cache = undefined;
    }

    static async $get(ids, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
      if (!Array.isArray(ids)) {
        return (await this.$get([ids], {fields, populate, throwIfNotFound}))[0];
      }

      for (const id of ids) {
        this.validateId(id);
      }

      const storables = ids.map(id => this.$deserialize({_id: id}));
      await this.$load(storables, {fields, reload, populate, throwIfNotFound});
      return storables;
    }

    static async $load(storables, {fields, reload, populate = true, throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$load([storables], {fields, reload, populate, throwIfNotFound}))[0];
      }

      fields = this.prototype.$createFieldMask(fields);

      await this.__loadRootStorables(storables, {fields, reload, throwIfNotFound});

      if (populate) {
        // TODO:
        // await this.$populate(storables, {fields, throwIfNotFound});
      }

      return storables;
    }

    static async $reload(storables, {fields, populate = true, throwIfNotFound = true} = {}) {
      await this.$load(storables, {fields, reload: true, populate, throwIfNotFound});
    }

    static async __loadRootStorables(storables, {fields, reload, throwIfNotFound}) {
      await this.__loadFromStore(storables, {fields, reload, throwIfNotFound});

      for (const storable of storables) {
        await storable.$afterLoad({fields});
      }
    }

    static async __loadFromStore(storables, {fields, reload, throwIfNotFound}) {
      fields = this.prototype.$createFieldMaskForStorableFields(fields);

      if (!reload) {
        const {missingStorables, missingFields} = this.__cache.load(storables, {fields});

        if (missingStorables.length === 0) {
          return;
        }

        storables = missingStorables;
        fields = missingFields;
      }

      let serializedStorables = storables.map(storable => storable.$serializeReference());

      const store = this.$getStore();
      const serializedFields = fields.serialize();
      serializedStorables = await store.load(serializedStorables, {
        fields: serializedFields,
        throwIfNotFound
      });

      for (const serializedStorable of serializedStorables) {
        this.$deserialize(serializedStorable);
      }

      this.__cache.save(storables, {fields});
    }

    async $load({fields, reload, populate = true, throwIfNotFound = true} = {}) {
      await this.constructor.$load([this], {fields, reload, populate, throwIfNotFound});
    }

    async $reload({fields, populate = true, throwIfNotFound = true} = {}) {
      await this.$load({fields, reload: true, populate, throwIfNotFound});
    }

    static async $populate(storables, {fields, throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$populate([storables], {fields, throwIfNotFound}))[0];
      }

      fields = new FieldMask(fields);

      let didLoad;
      do {
        didLoad = await this.__populate(storables, {fields, throwIfNotFound});
      } while (didLoad);
    }

    static async __populate(storables, {fields, throwIfNotFound}) {
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
            entry.fields = FieldMask.add(entry.fields, fields);
          },
          {fields}
        );
      }

      if (!storablesByClass.size) {
        return false;
      }

      for (const [klass, {storables, fields}] of storablesByClass.entries()) {
        await klass.$load(storables, {fields, populate: false, throwIfNotFound});
      }

      return true;
    }

    async $populate({fields, throwIfNotFound = true} = {}) {
      return (await this.constructor.$populate([this], {fields, throwIfNotFound}))[0];
    }

    static async $save(
      storables,
      {fields, throwIfNotFound = true, throwIfAlreadyExists = true} = {}
    ) {
      if (!Array.isArray(storables)) {
        return (await this.$save([storables], {throwIfNotFound, throwIfAlreadyExists}))[0];
      }

      fields = this.prototype.$createFieldMask(fields);

      for (const storable of storables) {
        await storable.$beforeSave();
      }

      for (const storable of storables) {
        storable.$validate({fields});
      }

      await this.__saveToStore(storables, {fields, throwIfNotFound, throwIfAlreadyExists});

      for (const storable of storables) {
        await storable.$afterSave();
      }

      return storables;
    }

    static async __saveToStore(storables, {fields, throwIfNotFound, throwIfAlreadyExists}) {
      fields = this.prototype.$createFieldMaskForStorableFields();

      let serializedStorables = storables.map(storable => storable.$serialize({fields}));

      const store = this.$getStore();
      serializedStorables = await store.save(serializedStorables, {
        throwIfNotFound,
        throwIfAlreadyExists
      });

      for (const serializedStorable of serializedStorables) {
        this.$deserialize(serializedStorable);
      }

      this.__cache.save(storables, {fields});
    }

    async $save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      await this.constructor.$save([this], {throwIfNotFound, throwIfAlreadyExists});
    }

    static async $delete(storables, {throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$delete([storables], {throwIfNotFound}))[0];
      }

      for (const storable of storables) {
        await storable.$beforeDelete();
      }

      await this.__deleteFromStore(storables, {throwIfNotFound});

      for (const storable of storables) {
        await storable.$afterDelete();
      }

      this.__cache.delete(storables);

      return storables;
    }

    static async __deleteFromStore(storables, {throwIfNotFound}) {
      const serializedStorables = storables.map(storable => storable.$serializeReference());

      const store = this.$getStore();
      await store.delete(serializedStorables, {throwIfNotFound});
    }

    async $delete({throwIfNotFound = true} = {}) {
      await this.constructor.$delete([this], {throwIfNotFound});
    }

    static async $find({
      filter,
      sort,
      skip,
      limit,
      load = true,
      reload,
      fields,
      populate,
      throwIfNotFound
    } = {}) {
      fields = this.prototype.$createFieldMask(fields);

      const storables = await this.__findInStore({filter, sort, skip, limit, fields: {}}); // TODO: Remove 'fields' option

      if (load) {
        await this.$load(storables, {fields, reload, populate, throwIfNotFound});
      }

      return storables;
    }

    static async __findInStore({filter, sort, skip, limit, fields}) {
      fields = this.prototype.$createFieldMaskForStorableFields(fields);

      const store = this.$getStore();
      const serializedFields = fields.serialize();
      const serializedStorables = await store.find(
        {_type: this.$getRegisteredName(), ...filter},
        {sort, skip, limit, fields: serializedFields}
      );

      const storables = serializedStorables.map(serializedStorable =>
        this.$deserialize(serializedStorable)
      );

      return storables;
    }

    static $getStore({throwIfNotFound = true} = {}) {
      const layer = this.$getLayer({throwIfNotFound});
      const store = layer?.get('store', {throwIfNotFound});
      if (store !== undefined) {
        return store;
      }
      if (throwIfNotFound) {
        throw new Error(`Store not found`);
      }
    }

    // === Hooks ===

    async $afterLoad() {
      for (const substorable of this.$getSubstorables()) {
        await substorable.$afterLoad();
      }
    }

    async $beforeSave() {
      for (const substorable of this.$getSubstorables()) {
        await substorable.$beforeSave();
      }
    }

    async $afterSave() {
      for (const substorable of this.$getSubstorables()) {
        await substorable.$afterSave();
      }
    }

    async $beforeDelete() {
      for (const substorable of this.$getSubstorables()) {
        await substorable.$beforeDelete();
      }
    }

    async $afterDelete() {
      for (const substorable of this.$getSubstorables()) {
        await substorable.$afterDelete();
      }
    }

    $getSubstorables() {
      const filter = function (field) {
        return typeof field.getScalar().getModel()?.isSubstorable === 'function';
      };
      return this.$getFieldValues({filter});
    }

    // === Storable fields ===

    $addStorableField(name) {
      if (!this.__storableFields) {
        this.__storableFields = new Map();
      } else if (!hasOwnProperty(this, '__storableFields')) {
        this.__storableFields = new Map(this.__storableFields);
      }
      this.__storableFields.set(name, {name});
    }

    $createFieldMaskForStorableFields(fields = true) {
      return this.$createFieldMask(fields, {
        filter(field) {
          return field.getParent().__storableFields?.has(field.getName());
        }
      });
    }
  };

// === Decorators ===

export function storable() {
  return function (target, name, descriptor) {
    target.$addStorableField(name);
    return descriptor;
  };
}
