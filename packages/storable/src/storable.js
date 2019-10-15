import {FieldMask, isModel} from '@liaison/model';
import {isIdentity} from '@liaison/identity';
import difference from 'lodash/difference';
import uniq from 'lodash/uniq';
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

    static async $get(keys, {fields, exclude, reload, throwIfNotFound = true} = {}) {
      if (!Array.isArray(keys)) {
        return (await this.$get([keys], {fields, reload, throwIfNotFound}))[0];
      }

      const {name, values} = this.__extractKeys(keys);

      let storables;
      if (name === 'id') {
        storables = values.map(
          value => this.$getInstance({_id: value}) || this.$deserialize({_id: value})
        );
      } else {
        storables = await this.$getId(name, values, {exclude, reload, throwIfNotFound});
      }

      return await this.$load(storables, {fields, reload, throwIfNotFound});
    }

    static async $getId(name, values, {exclude, reload, throwIfNotFound}) {
      // TODO: Consider removing this method
      // It should be possible to use any unique field as primary key

      const {storables = [], missingValues = values} = !reload ?
        this.__getIdFromMemory(name, values) :
        {};

      if (missingValues.length === 0) {
        return storables;
      }

      let missingStorables;

      if (this.$hasStore()) {
        missingStorables = await this.__getIdFromStore(name, missingValues, {
          exclude,
          throwIfNotFound
        });
      } else {
        missingStorables = await super.$getId(name, missingValues, {
          exclude,
          reload,
          throwIfNotFound
        });
      }

      return [...storables, ...missingStorables];
    }

    static __getIdFromMemory(name, values) {
      const storables = [];
      const missingValues = [];

      const storageSource = this.__getStoreOrParentLayerName();

      for (const value of values) {
        const storable = this.$getInstance({[name]: value}) || this.$deserialize({[name]: value});
        if (storable.$getField(name).getSource() === storageSource) {
          storables.push(storable);
        } else {
          missingValues.push(value);
        }
      }

      return {storables, missingValues};
    }

    static async __getIdFromStore(
      name,
      values,
      {exclude: excludedStorables = [], throwIfNotFound}
    ) {
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

      let serializedStorables = await store.find(
        {_type: this.$getRegisteredName(), [name]: values},
        {fields: {[name]: true}}
      );

      // TODO: Implement store.find() 'not-in' operator so we don't need to filter afterward
      serializedStorables = serializedStorables.filter(
        serializedStorable => !excludedIds.includes(serializedStorable._id)
      );

      const foundValues = serializedStorables.map(serializedStorable => serializedStorable[name]);

      const uniqueValues = uniq(foundValues);
      if (uniqueValues.length < foundValues.length) {
        throw new Error(`Found duplicated values in a unique field (name: '${name}')`);
      }

      if (foundValues.length < values.length && throwIfNotFound) {
        const missingValues = difference(values, foundValues);
        throw new Error(`Item(s) not found (${name}(s): ${JSON.stringify(missingValues)})`);
      }

      const storables = serializedStorables.map(serializedStorable =>
        this.$deserialize(serializedStorable, {source: storeName})
      );

      return storables;
    }

    static __extractKeys(keys) {
      let name;
      const values = new Set();

      for (const key of keys) {
        ow(key, ow.object);

        const keyNames = Object.keys(key);
        if (keyNames.length !== 1) {
          throw new Error(
            `A key must be an object composed of one unique field (key: ${JSON.stringify(key)})`
          );
        }

        const keyName = keyNames[0];

        if (name === undefined) {
          const isUnique = keyName === 'id' || this.prototype.$getField(keyName).isUnique();
          if (!isUnique) {
            throw new Error(`A key name must correspond to a unique field (name: '${keyName}')`);
          }
          name = keyName;
        } else if (name !== keyName) {
          throw new Error(
            `Cannot handle different key names in a set of keys (keys: ${JSON.stringify(keys)})`
          );
        }

        const keyValue = key[keyName];

        if (keyValue === undefined) {
          throw new Error(`A key value cannot be undefined (name: '${name}')`);
        }

        if (values.has(keyValue)) {
          throw new Error(`A key value cannot be duplicated (name: '${name}')`);
        }

        values.add(keyValue);
      }

      return {name, values: Array.from(values)};
    }

    static async $has(keys, {exclude, reload} = {}) {
      if (!Array.isArray(keys)) {
        keys = [keys];
      }

      const storables = await this.$get(keys, {
        fields: false,
        exclude,
        reload,
        throwIfNotFound: false
      });

      return storables.length === keys.length;
    }

    static async $load(storables, {fields, reload, throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$load([storables], {fields, reload, throwIfNotFound}))[0];
      }

      fields = this.prototype.$createFieldMask({fields, includeReferencedEntities: true});

      const loadedStorables = await this.__load(storables, {fields, reload, throwIfNotFound});

      await this.__populate(loadedStorables, {fields, reload, throwIfNotFound});

      return loadedStorables;
    }

    static async $reload(storables, {fields, throwIfNotFound = true} = {}) {
      return await this.$load(storables, {fields, reload: true, throwIfNotFound});
    }

    async $load({fields, reload, throwIfNotFound = true} = {}) {
      return await this.constructor.$load(this, {fields, reload, throwIfNotFound});
    }

    async $reload({fields, throwIfNotFound = true} = {}) {
      return await this.$load({fields, reload: true, throwIfNotFound});
    }

    static async __load(storablesToLoad, {fields, reload, throwIfNotFound}) {
      // Remove fields of referenced entities
      fields = this.prototype.$createFieldMask({fields, includeReferencedEntities: false});

      let loadedStorables = [];

      if (!reload) {
        const {
          loadedStorables: loadedStorablesFromMemory,
          missingStorables,
          missingFields
        } = this.__loadFromMemory(storablesToLoad, {fields});

        loadedStorables = loadedStorablesFromMemory;
        storablesToLoad = missingStorables;
        fields = missingFields;
      }

      const actuallyLoadedStorables = await this.__loadFromStoreOrParentLayer(storablesToLoad, {
        fields,
        reload,
        throwIfNotFound
      });

      loadedStorables = [...loadedStorables, ...actuallyLoadedStorables];

      return loadedStorables;
    }

    static __loadFromMemory(storables, {fields}) {
      const loadedStorables = [];
      const missingStorables = [];
      let allMissingFields = new FieldMask();

      const storageSource = this.__getStoreOrParentLayerName();

      for (const storable of storables) {
        const idIsMissing = storable.$getIdSource() !== storageSource;
        const existingFields = storable.$createFieldMaskForSource(storageSource, {fields});
        const missingFields = FieldMask.remove(fields, existingFields);

        if (idIsMissing || !missingFields.isEmpty()) {
          missingStorables.push(storable);
          allMissingFields = FieldMask.add(allMissingFields, missingFields);
        } else {
          loadedStorables.push(storable);
        }
      }

      return {loadedStorables, missingStorables, missingFields: allMissingFields};
    }

    static async __loadFromStoreOrParentLayer(storablesToLoad, {fields, reload, throwIfNotFound}) {
      if (storablesToLoad.length === 0) {
        return storablesToLoad; // OPTIMIZATION
      }

      let loadedStorables;

      if (this.$hasStore()) {
        loadedStorables = await this.__loadFromStore(storablesToLoad, {fields, throwIfNotFound});
      } else {
        loadedStorables = await super.$load(storablesToLoad, {fields, reload, throwIfNotFound});
      }

      for (const loadedStorable of loadedStorables) {
        for (const field of loadedStorable.$getFieldsWithHook('loader', {
          fields,
          includeInactiveFields: true
        })) {
          await field.callHook('loader');
        }
      }

      for (const loadedStorable of loadedStorables) {
        await loadedStorable.$afterLoad({fields});
      }

      return loadedStorables;
    }

    static async __loadFromStore(storablesToLoad, {fields, throwIfNotFound}) {
      const loadedStorables = [];

      fields = this.prototype.$createFieldMaskForNonVolatileFields({fields});

      const store = this.$getStore();
      const storeName = this.$getStoreName();

      let missingStorables;
      if (fields.isEmpty()) {
        missingStorables = [];

        for (const storableToLoad of storablesToLoad) {
          const idIsMissing = storableToLoad.$getIdSource() !== storeName;
          if (idIsMissing) {
            missingStorables.push(storableToLoad);
          } else {
            loadedStorables.push(storableToLoad);
          }
        }
      } else {
        missingStorables = storablesToLoad;
      }

      if (missingStorables.length === 0) {
        return loadedStorables;
      }

      let serializedStorables = missingStorables.map(storable => storable.$serializeReference());

      const serializedFields = fields.serialize();

      serializedStorables = await store.load(serializedStorables, {
        fields: serializedFields,
        throwIfNotFound
      });

      for (const serializedStorable of serializedStorables) {
        // TODO: Modify MongoDBStore so we can get rid of the following test:
        if (!serializedStorable._missed) {
          loadedStorables.push(this.$deserialize(serializedStorable, {source: storeName}));
        }
      }

      return loadedStorables;
    }

    static async __populate(storables, {fields, reload, throwIfNotFound}) {
      const storablesByClass = new Map();

      const traverse = (model, rootFields) => {
        for (const {value, fields} of model.$getFieldValues({fields: rootFields})) {
          if (isStorable(value)) {
            const storable = value;
            const Storable = storable.constructor;

            let entry = storablesByClass.get(Storable);

            if (!entry) {
              entry = {storables: new Set(), fields: new FieldMask()};
              storablesByClass.set(Storable, entry);
            }

            entry.storables.add(storable);
            entry.fields = FieldMask.add(entry.fields, fields);
          } else if (isModel(value)) {
            const model = value;
            traverse(model);
          }
        }
      };

      for (const storable of storables) {
        traverse(storable, fields);
      }

      for (const [Storable, {storables, fields}] of storablesByClass.entries()) {
        await Storable.$load(Array.from(storables), {fields, reload, throwIfNotFound});
      }
    }

    static async $save(storables, {throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$save([storables], {throwIfNotFound, throwIfAlreadyExists}))[0];
      }

      for (const storable of storables) {
        for (const field of storable.$getFieldsWithHook('saver')) {
          await field.callHook('saver');
        }
      }

      for (const storable of storables) {
        await storable.$beforeSave();
      }

      if (this.$hasStore()) {
        storables = await this.__saveToStore(storables, {throwIfNotFound, throwIfAlreadyExists});
      } else {
        storables = await super.$save(storables, {throwIfNotFound, throwIfAlreadyExists});
      }

      for (const storable of storables) {
        await storable.$afterSave();
      }

      return storables;
    }

    static async __saveToStore(storables, {throwIfNotFound, throwIfAlreadyExists}) {
      const fields = this.prototype.$createFieldMaskForNonVolatileFields();

      for (const storable of storables) {
        storable.$validate({fields});
      }

      const store = this.$getStore();
      const storeName = this.$getStoreName();

      let serializedStorables = storables.map(storable =>
        storable.$serialize({fields, target: storeName})
      );

      serializedStorables = await store.save(serializedStorables, {
        throwIfNotFound,
        throwIfAlreadyExists
      });

      storables = serializedStorables.map(serializedStorable =>
        this.$deserialize(serializedStorable, {source: storeName})
      );

      return storables;
    }

    async $save({throwIfNotFound = true, throwIfAlreadyExists = true} = {}) {
      return await this.constructor.$save(this, {throwIfNotFound, throwIfAlreadyExists});
    }

    static async $delete(storables, {throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$delete([storables], {throwIfNotFound}))[0];
      }

      for (const storable of storables) {
        await storable.$beforeDelete();
      }

      if (this.$hasStore()) {
        await this.__deleteFromStore(storables, {throwIfNotFound});
      } else {
        await super.$delete(storables, {throwIfNotFound});
      }

      for (const storable of storables) {
        await storable.$afterDelete();
      }

      for (const storable of storables) {
        storable.$detach();
      }

      return storables;
    }

    static async __deleteFromStore(storables, {throwIfNotFound}) {
      const serializedStorables = storables.map(storable => storable.$serializeReference());

      const store = this.$getStore();
      await store.delete(serializedStorables, {throwIfNotFound});
    }

    async $delete({throwIfNotFound = true} = {}) {
      return await this.constructor.$delete(this, {throwIfNotFound});
    }

    static async $find({filter, sort, skip, limit, fields, reload, throwIfNotFound} = {}) {
      let storables;

      filter = await this._resolveFilter(filter);

      if (this.$hasStore()) {
        storables = await this.__findInStore({filter, sort, skip, limit, fields: {}}); // TODO: Remove 'fields' option
      } else {
        storables = await super.$find({filter, sort, skip, limit, fields: false});
      }

      await this.$load(storables, {fields, reload, throwIfNotFound});

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
