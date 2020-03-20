import {EntityMixin, method, AttributeSelector} from '@liaison/entity';
import ow from 'ow';

import {isStorableClass, isStorableInstance} from './utilities';

const StorableMixin = (Base = Object) => {
  ow(Base, 'Base', ow.function);

  if (isStorableClass(Base)) {
    return Base;
  }

  class StorableMixin extends EntityMixin(Base) {
    static getComponentType() {
      return 'Storable';
    }

    // === Store registration ===

    static getStore() {
      const store = this.__store;

      if (store === undefined) {
        throw new Error(
          `Cannot get the store of ${this.describeComponentType()} that is not registered in any store (${this.describeComponent()})`
        );
      }

      return store;
    }

    static hasStore() {
      return this.__store !== undefined;
    }

    static __setStore(store) {
      Object.defineProperty(this, '__store', {value: store});
    }

    // === Storable classes ===

    @method() static async load() {
      // ...
    }

    @method() static async reload() {
      // ...
    }

    @method() static async save() {
      // ...
    }

    @method() static async delete() {
      // ...
    }

    // === Storable instances ===

    @method() static async get(identifierDescriptor, attributeSelector = true, options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          reload: ow.optional.boolean,
          throwIfMissing: ow.optional.boolean,
          _callerMethodName: ow.optional.string.nonEmpty
        })
      );

      identifierDescriptor = this.normalizeIdentifierDescriptor(identifierDescriptor);
      attributeSelector = AttributeSelector.normalize(attributeSelector);

      const {reload = false, throwIfMissing = true, _callerMethodName = 'get'} = options;

      const storable = this.prototype.deserialize(identifierDescriptor, {excludeIsNewMark: true});

      return await storable.load(attributeSelector, {reload, throwIfMissing, _callerMethodName});
    }

    @method() static async has(identifierDescriptor, options = {}) {
      ow(options, 'options', ow.object.exactShape({reload: ow.optional.boolean}));

      const {reload = false} = options;

      const storable = await this.get(
        identifierDescriptor,
        {},
        {reload, throwIfMissing: false, _callerMethodName: 'has'}
      );

      return storable !== undefined;
    }

    @method() async load(attributeSelector = true, options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          reload: ow.optional.boolean,
          throwIfMissing: ow.optional.boolean,
          _callerMethodName: ow.optional.string.nonEmpty
        })
      );

      if (this.isNew()) {
        throw new Error(
          `Cannot load ${this.describeComponentType()} that is new (${this.describeComponent()})`
        );
      }

      attributeSelector = this.expandAttributeSelector(attributeSelector);

      const {reload = false, throwIfMissing = true, _callerMethodName} = options;

      if (!reload) {
        // TODO
      }

      let loadedStorable;

      if (this.constructor.hasStore()) {
        loadedStorable = await this.__loadFromStore(attributeSelector, {throwIfMissing});
      } else if (super.load !== undefined) {
        loadedStorable = await super.load(attributeSelector, {reload, throwIfMissing});
      } else {
        throw new Error(
          `To be able to execute the load() method${describeCaller(
            _callerMethodName
          )}, ${this.describeComponentType()} should be registered in a store or have an exposed load() remote method (${this.describeComponent()})`
        );
      }

      return loadedStorable;
    }

    async __loadFromStore(attributeSelector, {throwIfMissing}) {
      const store = this.constructor.getStore();

      const storableName = this.getComponentName();
      const identifierDescriptor = this.getIdentifierDescriptor();

      // Always include the identifier attribute
      const identifierAttributeSelector = AttributeSelector.fromNames(
        Object.keys(identifierDescriptor)
      );
      attributeSelector = AttributeSelector.add(attributeSelector, identifierAttributeSelector);

      const serializedStorable = await store.load(
        {storableName, identifierDescriptor},
        {attributeSelector, throwIfMissing}
      );

      if (serializedStorable === undefined) {
        return undefined;
      }

      const loadedStorable = this.deserialize(serializedStorable);

      return loadedStorable;
    }

    @method() async reload(attributeSelector = true, options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      const {throwIfMissing = true} = options;

      return await this.load(attributeSelector, {
        reload: true,
        throwIfMissing,
        _callerMethodName: 'reload'
      });
    }

    @method() async save(attributeSelector = true, options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({
          throwIfMissing: ow.optional.boolean,
          throwIfExists: ow.optional.boolean
        })
      );

      const isNew = this.isNew();

      attributeSelector = AttributeSelector.normalize(attributeSelector);

      const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

      if (throwIfMissing === true && throwIfExists === true) {
        throw new Error(
          "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
        );
      }

      let savedStorable;

      if (this.constructor.hasStore()) {
        savedStorable = await this.__saveToStore(attributeSelector, {
          throwIfMissing,
          throwIfExists
        });
      } else if (super.save !== undefined) {
        savedStorable = await super.save(attributeSelector, {throwIfMissing, throwIfExists});
      } else {
        throw new Error(
          `To be able to execute the save() method, ${this.describeComponentType()} should be registered in a store or have an exposed save() remote method (${this.describeComponent()})`
        );
      }

      return savedStorable;
    }

    async __saveToStore(attributeSelector, {throwIfMissing, throwIfExists}) {
      this.validate(attributeSelector);

      const store = this.constructor.getStore();

      const storableName = this.getComponentName();
      const identifierDescriptor = this.getIdentifierDescriptor();
      const isNew = this.isNew();

      let serializedStorable = this.serialize({attributeSelector, includeIsNewMark: false});

      serializedStorable = await store.save(
        {storableName, identifierDescriptor, serializedStorable, isNew},
        {throwIfMissing, throwIfExists}
      );

      if (serializedStorable === undefined) {
        return undefined;
      }

      if (isNew) {
        this.markAsNotNew();
      }

      return this;
    }

    @method() async delete() {
      // ...
    }

    @method() static async find(query) {
      console.log(query);
    }

    @method() static async count(query) {
      console.log(query);
    }

    // === Utilities ===

    static isStorable(object) {
      return isStorableInstance(object);
    }
  }

  return StorableMixin;
};

export class Storable extends StorableMixin() {
  static __ComponentMixin = StorableMixin;
}

function describeCaller(callerMethodName) {
  return callerMethodName !== undefined ? ` (called from ${callerMethodName}())` : '';
}
