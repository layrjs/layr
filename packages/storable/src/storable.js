import {FieldMask, isModel} from '@liaison/model';
import {isIdentity} from '@liaison/identity';
import zip from 'lodash/zip';
import unzip from 'lodash/unzip';
import fill from 'lodash/fill';
import ow from 'ow';

import {StorableField} from './storable-field';
import {StorableMethod} from './storable-method';

export const Storable = (Base, {storeName} = {}) => {
  let Storable;

  if (!isStorable(Base.prototype)) {
    Storable = makeStorable(Base);
  } else {
    Storable = class Storable extends Base {};
  }

  Storable.__storeName = storeName;

  return Storable;
};

function makeStorable(Base) {
  const Storable = class Storable extends Base {
    static $Field = StorableField;

    static $Method = StorableMethod;

    static async $get(key, {fields, exclude, reload, throwIfNotFound = true} = {}) {
      const {name, value} = this.__extractKey(key);

      let storable;

      if (name === 'id') {
        storable = this.$getInstance({_id: value}) || this.$deserialize({_id: value});
      } else {
        storable = await this.$getId(name, value, {exclude, reload, throwIfNotFound});
      }

      if (storable === undefined) {
        return undefined;
      }

      return await this.$load(storable, {fields, reload, throwIfNotFound});
    }

    static async $getMany(keys, {fields, exclude, reload, throwIfNotFound = true} = {}) {
      if (!Array.isArray(fields)) {
        fields = fill(Array(keys.length), fields);
      }

      return await this.$getLayer()
        .fork()
        .batch(batchedLayer => {
          const BatchedStorable = this.$forkInto(batchedLayer);
          return zip(keys, fields).map(async ([key, fields]) => {
            const batchedStorable = await BatchedStorable.$get(key, {
              fields,
              exclude,
              reload,
              throwIfNotFound
            });

            if (batchedStorable === undefined) {
              return undefined;
            }

            return this.$deserialize(
              batchedStorable.$serialize({includeReferencedEntities: true}),
              {includeReferencedEntities: true}
            );
          });
        });
    }

    static async $getId(name, value, {exclude, reload, throwIfNotFound}) {
      // TODO: Consider removing this method
      // It should be possible to use any unique field as primary key

      let storable = !reload ? this.__getIdFromMemory(name, value) : undefined;

      if (storable !== undefined) {
        return storable;
      }

      if (this.$hasStore()) {
        storable = await this.__getIdFromStore(name, value, {exclude, throwIfNotFound});
      } else {
        storable = await super.$getId(name, value, {exclude, reload, throwIfNotFound});
      }

      return storable;
    }

    static __getIdFromMemory(name, value) {
      const storable = this.$getInstance({[name]: value}) || this.$deserialize({[name]: value});

      const storageSource = this.__getStoreOrParentLayerName();

      if (storable.$getField(name).getSource() !== storageSource) {
        return undefined;
      }

      return storable;
    }

    static async __getIdFromStore(name, value, {exclude: excludedStorables = [], throwIfNotFound}) {
      if (!Array.isArray(excludedStorables)) {
        excludedStorables = [excludedStorables];
      }

      const excludedIds = excludedStorables.map(excludedStorable => {
        if (!isStorable(excludedStorable)) {
          throw new Error(
            `Invalid value specified in the 'exclude' parameter (a storable was expected)`
          );
        }

        const {id} = excludedStorable;

        if (id === undefined) {
          throw new Error(`'id' is missing in a storable specified in the 'exclude' parameter`);
        }

        return id;
      });

      const store = this.$getStore();
      const storeName = this.$getStoreName();

      const serializedStorables = await store.find(
        {_type: this.$getRegisteredName(), [name]: value},
        {fields: {[name]: true}}
      );

      if (serializedStorables > 1) {
        throw new Error(`Found duplicated values in a unique field (name: '${name}')`);
      }

      let serializedStorable = serializedStorables[0];

      // TODO: Implement store.find() 'not-in' operator so we don't need to filter afterward
      if (serializedStorable !== undefined && excludedIds.includes(serializedStorable._id)) {
        serializedStorable = undefined;
      }

      if (serializedStorable === undefined) {
        if (throwIfNotFound) {
          throw new Error(`Item not found (${name}: ${JSON.stringify(value)})`);
        }
        return undefined;
      }

      const storable = this.$deserialize(serializedStorable, {source: storeName});

      return storable;
    }

    static __extractKey(key) {
      ow(key, ow.object);

      const names = Object.keys(key);

      if (names.length !== 1) {
        throw new Error(
          `A key must be an object composed of one unique field (key: ${JSON.stringify(key)})`
        );
      }

      const name = names[0];

      const isUnique = name === 'id' || this.prototype.$getField(name).isUnique();

      if (!isUnique) {
        throw new Error(`A key name must correspond to a unique field (name: '${name}')`);
      }

      const value = key[name];

      if (value === undefined) {
        throw new Error(`A key value cannot be undefined (name: '${name}')`);
      }

      return {name, value};
    }

    static async $has(key, {exclude, reload} = {}) {
      const storable = await this.$get(key, {
        fields: false,
        exclude,
        reload,
        throwIfNotFound: false
      });

      return storable !== undefined;
    }

    static async $load(storable, {fields, reload, throwIfNotFound = true} = {}) {
      return await storable.$load({fields, reload, throwIfNotFound});
    }

    static async $loadMany(storables, {fields, reload, throwIfNotFound = true} = {}) {
      if (!Array.isArray(fields)) {
        fields = fill(Array(storables.length), fields);
      }

      return await this.$getLayer()
        .fork()
        .batch(batchedLayer => {
          return zip(storables, fields).map(async ([storable, fields]) => {
            const batchedStorable = storable.$forkInto(batchedLayer);

            const loadedStorable = await batchedStorable.$load({fields, reload, throwIfNotFound});

            if (loadedStorable === undefined) {
              return undefined;
            }

            storable.$merge(loadedStorable, {includeReferencedEntities: true});

            return storable;
          });
        });
    }

    static async $reload(storable, {fields, throwIfNotFound = true} = {}) {
      return await this.$load(storable, {fields, reload: true, throwIfNotFound});
    }

    static async $reloadMany(storables, {fields, throwIfNotFound = true} = {}) {
      return await this.$loadMany(storables, {fields, reload: true, throwIfNotFound});
    }

    async $load({fields, reload, throwIfNotFound = true} = {}) {
      const loadedStorable = await this.__load({fields, reload, throwIfNotFound});

      if (loadedStorable === undefined) {
        return undefined;
      }

      await loadedStorable.__populate({fields, reload, throwIfNotFound});

      return loadedStorable;
    }

    async $reload({fields, throwIfNotFound = true} = {}) {
      return await this.$load({fields, reload: true, throwIfNotFound});
    }

    async __load({fields, reload, throwIfNotFound}) {
      fields = this.$createFieldMask({fields});

      if (!reload) {
        const storageSource = this.constructor.__getStoreOrParentLayerName();

        const idIsMissing = this.$getIdSource() !== storageSource;

        const existingFields = this.$createFieldMaskForSource(storageSource, {fields});
        const missingFields = FieldMask.remove(fields, existingFields);

        if (!idIsMissing && missingFields.isEmpty()) {
          return this; // Nothing to load
        }

        fields = missingFields;
      }

      const loadedStorable = await this.__loadFromStoreOrParentLayer({
        fields,
        reload,
        throwIfNotFound
      });

      return loadedStorable;
    }

    async __loadFromStoreOrParentLayer({fields, reload, throwIfNotFound}) {
      let loadedStorable;

      if (this.constructor.$hasStore()) {
        loadedStorable = await this.__loadFromStore({fields, throwIfNotFound});
      } else {
        loadedStorable = await super.$load({fields, reload, throwIfNotFound});
      }

      if (loadedStorable === undefined) {
        return undefined;
      }

      for (const field of loadedStorable.$getFieldsWithHook('loader', {
        fields,
        includeInactiveFields: true
      })) {
        await field.callHook('loader');
      }

      await loadedStorable.$afterLoad({fields});

      return loadedStorable;
    }

    async __loadFromStore({fields, throwIfNotFound}) {
      fields = this.$createFieldMaskForNonVolatileFields({fields});

      let serializedStorable = this.$serializeReference();

      const store = this.constructor.$getStore();
      const serializedFields = fields.serialize();
      serializedStorable = (await store.load([serializedStorable], {
        fields: serializedFields,
        throwIfNotFound
      }))[0];

      // TODO: Modify MongoDBStore so we can get rid of the following test:
      if (serializedStorable._missed) {
        return undefined;
      }

      const storeName = this.constructor.$getStoreName();
      const loadedStorable = this.constructor.$deserialize(serializedStorable, {source: storeName});

      return loadedStorable;
    }

    async __populate({fields, reload, throwIfNotFound}) {
      fields = this.$createFieldMask({fields, includeReferencedEntities: true});

      const storablesWithFields = new Map(); // {storable: fields}

      const traverse = (model, rootFields) => {
        for (const {value, fields} of model.$getFieldValues({fields: rootFields})) {
          if (isStorable(value)) {
            const storable = value;
            if (!storablesWithFields.has(storable)) {
              storablesWithFields.set(storable, fields);
            } else {
              const previousFields = storablesWithFields.get(storable);
              storablesWithFields.set(storable, FieldMask.add(previousFields, fields));
            }
          } else if (isModel(value)) {
            const model = value;
            traverse(model);
          }
        }
      };

      traverse(this, fields);

      if (storablesWithFields.size === 0) {
        return;
      }

      const [storablesToLoad, fieldsToLoad] = unzip(Array.from(storablesWithFields.entries()));

      await this.constructor.$loadMany(storablesToLoad, {
        fields: fieldsToLoad,
        reload,
        throwIfNotFound
      });
    }

    static async $save(storable, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      return await storable.$save({throwIfNotFound, throwIfAlreadyExists});
    }

    static async $saveMany(storables, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      return await this.$getLayer()
        .fork()
        .batch(batchedLayer => {
          return storables.map(async storable => {
            const batchedStorable = storable.$forkInto(batchedLayer);

            const savedStorable = await batchedStorable.$save({
              throwIfNotFound,
              throwIfAlreadyExists
            });

            if (savedStorable === undefined) {
              return undefined;
            }

            storable.$merge(savedStorable);

            return storable;
          });
        });
    }

    async $save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      if (!this.$isNew() && this.$createFieldMaskForActiveFields().isEmpty()) {
        // Nothing to save
        return this;
      }

      for (const field of this.$getFieldsWithHook('saver')) {
        await field.callHook('saver');
      }

      await this.$beforeSave();

      let savedStorable;

      if (this.constructor.$hasStore()) {
        savedStorable = await this.__saveToStore({throwIfNotFound, throwIfAlreadyExists});
      } else {
        savedStorable = await super.$save({throwIfNotFound, throwIfAlreadyExists});
      }

      if (savedStorable === undefined) {
        return undefined;
      }

      await savedStorable.$afterSave();

      return savedStorable;
    }

    async __saveToStore({throwIfNotFound, throwIfAlreadyExists}) {
      const fields = this.$createFieldMaskForNonVolatileFields();

      this.$validate({fields});

      const storeName = this.constructor.$getStoreName();

      let serializedStorable = this.$serialize({fields, target: storeName});

      const store = this.constructor.$getStore();
      serializedStorable = (await store.save([serializedStorable], {
        throwIfNotFound,
        throwIfAlreadyExists
      }))[0];

      // TODO: Modify MongoDBStore so we can get rid of the following test:
      if (serializedStorable._missed || serializedStorable._existed) {
        return undefined;
      }

      this.$deserialize(serializedStorable, {source: storeName});

      return this;
    }

    static async $delete(storable, {throwIfNotFound = true} = {}) {
      return await storable.$delete({throwIfNotFound});
    }

    static async $deleteMany(storables, {throwIfNotFound = true} = {}) {
      return await this.$getLayer()
        .fork()
        .batch(batchedLayer => {
          return storables.map(async storable => {
            const batchedStorable = storable.$forkInto(batchedLayer);

            const deletedStorable = await batchedStorable.$delete({throwIfNotFound});

            if (deletedStorable === undefined) {
              return undefined;
            }

            storable.$merge(deletedStorable);

            return storable;
          });
        });
    }

    async $delete({throwIfNotFound = true} = {}) {
      await this.$beforeDelete();

      let deletedStorable;

      if (this.constructor.$hasStore()) {
        deletedStorable = await this.__deleteFromStore({throwIfNotFound});
      } else {
        deletedStorable = await super.$delete({throwIfNotFound});
      }

      if (deletedStorable === undefined) {
        return undefined;
      }

      await deletedStorable.$afterDelete();

      deletedStorable.$detach();

      return deletedStorable;
    }

    async __deleteFromStore({throwIfNotFound}) {
      let serializedStorable = this.$serializeReference();

      const store = this.constructor.$getStore();
      serializedStorable = (await store.delete([serializedStorable], {throwIfNotFound}))[0];

      if (serializedStorable._missed) {
        return undefined;
      }

      return this;
    }

    static async $find({filter, sort, skip, limit, fields, reload, throwIfNotFound} = {}) {
      let storables;

      filter = await this._resolveFilter(filter);

      if (this.$hasStore()) {
        storables = await this.__findInStore({filter, sort, skip, limit, fields: {}}); // TODO: Remove 'fields' option
      } else {
        storables = await super.$find({filter, sort, skip, limit, fields: false});
      }

      await this.$loadMany(storables, {fields, reload, throwIfNotFound});

      return storables;
    }

    static async _resolveFilter(filter) {
      if (filter === undefined) {
        return undefined;
      }

      for (const property of this.prototype.$getPropertiesWithHook('finder')) {
        filter = await property.callHook('finder', filter);
      }

      return filter;
    }

    static async __findInStore({filter, sort, skip, limit, fields}) {
      fields = this.prototype.$createFieldMaskForNonVolatileFields({fields});

      const store = this.$getStore();
      const storeName = this.$getStoreName();
      const serializedFilter = this.__serializeFilter(filter);
      const serializedFields = fields.serialize();

      const serializedStorables = await store.find(
        {_type: this.$getRegisteredName(), ...serializedFilter},
        {sort, skip, limit, fields: serializedFields}
      );

      const storables = serializedStorables.map(serializedStorable =>
        this.$deserialize(serializedStorable, {source: storeName})
      );

      return storables;
    }

    static __serializeFilter(filter) {
      if (filter === undefined) {
        return undefined;
      }

      if (isIdentity(filter)) {
        const identity = filter;
        // TODO: Consider including the '_type' of the model so we can support polymorphism
        return {_id: identity.id};
      }

      const serializedFilter = {};

      for (let [name, value] of Object.entries(filter)) {
        if (name === '$identity') {
          let identities = value;
          if (!Array.isArray(identities)) {
            identities = [identities];
          }
          const ids = identities.map(identity => identity.id);
          name = '_id';
          value = ids;
        } else if (Array.isArray(value)) {
          value = value.map(value => this.__serializeFilter(value));
        } else if (typeof value === 'object' && value !== null) {
          value = this.__serializeFilter(value);
        }
        serializedFilter[name] = value;
      }

      return serializedFilter;
    }

    static $getStore() {
      return this.$getLayer().get(this.__storeName);
    }

    static $hasStore() {
      return this.__storeName !== undefined;
    }

    static $getStoreName() {
      return this.__storeName;
    }

    static __getStoreOrParentLayerName() {
      if (this.__storeName !== undefined) {
        return this.__storeName;
      }
      return this.$getParentLayer().getName();
    }

    // === Hooks ===

    async $afterLoad() {
      for (const field of this.$getFieldsWithHook('afterLoad')) {
        await field.callHook('afterLoad');
      }

      for (const substorable of this.$getSubstorables()) {
        await substorable.$afterLoad();
      }
    }

    async $beforeSave() {
      for (const field of this.$getFieldsWithHook('beforeSave')) {
        await field.callHook('beforeSave');
      }

      for (const substorable of this.$getSubstorables()) {
        await substorable.$beforeSave();
      }
    }

    async $afterSave() {
      for (const field of this.$getFieldsWithHook('afterSave')) {
        await field.callHook('afterSave');
      }

      for (const substorable of this.$getSubstorables()) {
        await substorable.$afterSave();
      }
    }

    async $beforeDelete() {
      for (const field of this.$getFieldsWithHook('beforeDelete')) {
        await field.callHook('beforeDelete');
      }

      for (const substorable of this.$getSubstorables()) {
        await substorable.$beforeDelete();
      }
    }

    async $afterDelete() {
      for (const field of this.$getFieldsWithHook('afterDelete')) {
        await field.callHook('afterDelete');
      }

      for (const substorable of this.$getSubstorables()) {
        await substorable.$afterDelete();
      }
    }

    $getSubstorables() {
      const filter = function (_field) {
        // TODO
        return false;
      };
      return Array.from(this.$getFieldValues({filter})).map(result => result.value);
    }

    // === Storable properties ===

    $getPropertiesWithHook(name) {
      return this.$getProperties({
        filter(property) {
          return property.hasHook(name);
        }
      });
    }

    // === Storable fields ===

    $createFieldMaskForNonVolatileFields({fields = true, filter: otherFilter} = {}) {
      const filter = function (field) {
        if (field.isVolatile()) {
          return false;
        }
        if (otherFilter) {
          return otherFilter.call(this, field);
        }
        return true;
      };

      return this.$createFieldMask({fields, filter});
    }

    $getFieldsWithHook(name, {fields = true, includeInactiveFields = false} = {}) {
      return this.$getFields({
        fields,
        filter(field) {
          if (!includeInactiveFields && !field.isActive()) {
            return false;
          }
          return field.hasHook(name);
        }
      });
    }

    // === Utilities ===

    static $isStorable(object) {
      return isStorable(object);
    }
  };

  // Make existing fields storable
  for (const name of Base.prototype.$getFieldNames()) {
    Storable.prototype.$setField(name);
  }

  // Make existing methods storable
  for (const name of Base.prototype.$getMethodNames()) {
    Storable.prototype.$setMethod(name);
  }

  return Storable;
}

// === Utilities ===

export function isStorable(object) {
  return typeof object?.constructor?.$isStorable === 'function';
}
