import {Entity, FieldMask, isModel, isIdentity} from '@liaison/model';
import {hasOwnProperty, getInheritedPropertyDescriptor} from '@liaison/util';
import difference from 'lodash/difference';
import uniq from 'lodash/uniq';
import ow from 'ow';

import {StorableField} from './storable-field';
import {Cache} from './cache';

const DEFAULT_CACHE_SIZE = 1000;

export const Storable = (Base = Entity, {storeName} = {}) => {
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

    static async $open() {
      this.__cache = new Cache(this, {size: DEFAULT_CACHE_SIZE});
    }

    static async $get(keys, {fields, reload, throwIfNotFound = true} = {}) {
      if (!Array.isArray(keys)) {
        return (await this.$get([keys], {fields, reload, throwIfNotFound}))[0];
      }

      const {name, values} = this.__extractKeys(keys);

      let storables;
      if (name === 'id') {
        storables = values.map(value => this.$deserialize({_id: value}));
      } else {
        storables = await this.$getId(name, values, {reload, throwIfNotFound});
      }

      return await this.$load(storables, {fields, reload, throwIfNotFound});
    }

    static async $getId(name, values, {reload, throwIfNotFound}) {
      const {storables = [], missingValues = values} = !reload ?
        this.__cache.find(name, values) :
        {};

      if (missingValues.length === 0) {
        return storables;
      }

      let missingStorables;

      if (this.$hasStore()) {
        missingStorables = await this._getIdFromStore(name, missingValues, {throwIfNotFound});
      } else {
        missingStorables = await super.$getId(name, missingValues, {reload, throwIfNotFound});
      }

      this.__cache.save(missingStorables);

      return [...storables, ...missingStorables];
    }

    static async _getIdFromStore(name, values, {throwIfNotFound}) {
      const store = this.$getStore();
      const serializedStorables = await store.find(
        {_type: this.$getRegisteredName(), [name]: values},
        {fields: {[name]: true}}
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
        this.$deserialize(serializedStorable)
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

    static async $has(keys, {reload} = {}) {
      if (!Array.isArray(keys)) {
        return await this.$has([keys], {reload});
      }

      const storables = await this.$get(keys, {fields: false, reload, throwIfNotFound: false});

      return storables.length === keys.length;
    }

    static async $load(storables, {fields, reload, throwIfNotFound = true} = {}) {
      if (!Array.isArray(storables)) {
        return (await this.$load([storables], {fields, reload, throwIfNotFound}))[0];
      }

      fields = this.prototype.$createFieldMask(fields, {includeReferencedEntities: true});

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
      fields = this.prototype.$createFieldMask(fields); // Remove fields of referenced entities

      let loadedStorables = [];

      if (!reload) {
        const {
          loadedStorables: loadedStorablesFromCache,
          missingStorables,
          missingFields
        } = this.__cache.load(storablesToLoad, {
          fields
        });

        loadedStorables = loadedStorablesFromCache;
        storablesToLoad = missingStorables;
        fields = missingFields;
      }

      const actuallyLoadedStorables = await this.__loadFromStoreOrParentLayer(storablesToLoad, {
        fields,
        reload,
        throwIfNotFound
      });

      this.__cache.save(actuallyLoadedStorables);

      loadedStorables = [...loadedStorables, ...actuallyLoadedStorables];

      return loadedStorables;
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
        await loadedStorable.$afterLoad({fields});
      }

      return loadedStorables;
    }

    static async __loadFromStore(storables, {fields, throwIfNotFound}) {
      fields = this.prototype.$createFieldMaskForStorableFields(fields);

      let serializedStorables = storables.map(storable => storable.$serializeReference());

      const store = this.$getStore();
      const serializedFields = fields.serialize();
      serializedStorables = await store.load(serializedStorables, {
        fields: serializedFields,
        throwIfNotFound
      });

      const loadedStorables = [];

      for (const serializedStorable of serializedStorables) {
        // TODO: Modify MongoDBStore so we can get rid of the following test:
        if (!serializedStorable._missed) {
          loadedStorables.push(this.$deserialize(serializedStorable));
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
        await storable.$beforeSave();
      }

      if (this.$hasStore()) {
        await this.__saveToStore(storables, {throwIfNotFound, throwIfAlreadyExists});
      } else {
        await super.$save(storables, {throwIfNotFound, throwIfAlreadyExists});
      }

      for (const storable of storables) {
        await storable.$afterSave();
      }

      this.__cache.save(storables);

      return storables;
    }

    static async __saveToStore(storables, {throwIfNotFound, throwIfAlreadyExists}) {
      const fields = this.prototype.$createFieldMaskForStorableFields();

      for (const storable of storables) {
        storable.$validate({fields});
      }

      let serializedStorables = storables.map(storable => storable.$serialize({fields}));

      const store = this.$getStore();
      serializedStorables = await store.save(serializedStorables, {
        throwIfNotFound,
        throwIfAlreadyExists
      });

      for (const serializedStorable of serializedStorables) {
        this.$deserialize(serializedStorable);
      }
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

      this.__cache.delete(storables);

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

      for (const field of this.prototype.$getFields()) {
        const name = field.getName();
        const finder = field.getFinder();

        if (!finder) {
          continue;
        }

        const {[name]: value, ...remainingFilter} = filter;

        if (value === undefined) {
          continue;
        }

        let newFilter = await finder.call(this, value);

        if (
          isIdentity(newFilter) ||
          (Array.isArray(newFilter) && newFilter.every(item => isIdentity(item)))
        ) {
          // The finder returned an $identity shortcut
          newFilter = {$identity: newFilter};
        }

        filter = {...remainingFilter, ...newFilter};
      }

      return filter;
    }

    static async __findInStore({filter, sort, skip, limit, fields}) {
      fields = this.prototype.$createFieldMaskForStorableFields(fields);

      const store = this.$getStore();
      const serializedFilter = this.__serializeFilter(filter);
      const serializedFields = fields.serialize();
      const serializedStorables = await store.find(
        {_type: this.$getRegisteredName(), ...serializedFilter},
        {sort, skip, limit, fields: serializedFields}
      );

      const storables = serializedStorables.map(serializedStorable =>
        this.$deserialize(serializedStorable)
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
      return Array.from(this.$getFieldValues({filter})).map(result => result.value);
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

    // === Unique fields ===

    $getUniqueFields() {
      return this.$getFields({filter: field => field.isUnique()});
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

  return Storable;
}

// === Decorators ===

export function store() {
  return function (target, name, descriptor) {
    if (!isStorable(target)) {
      throw new Error(`@store() target must be a storable`);
    }
    if (!(name && descriptor)) {
      throw new Error(`@store() must be used to decorate properties`);
    }

    if (descriptor.initializer !== undefined) {
      // @store() is used on an property defined in a parent class
      // Example: `@store() title;`
      descriptor = getInheritedPropertyDescriptor(target, name);
      if (descriptor === undefined) {
        throw new Error(`Cannot use @store() with an undefined property (name: '${name}')`);
      }
    }

    target.$addStorableField(name);

    return descriptor;
  };
}

// === Utilities ===

export function isStorable(object) {
  return typeof object?.constructor?.$isStorable === 'function';
}
