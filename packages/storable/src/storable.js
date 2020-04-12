import {serialize, isComponentClassOrInstance, getTypeOf} from '@liaison/component';
import {isModelAttribute, isComponentType, isArrayType} from '@liaison/model';
import {EntityMixin, method, AttributeSelector} from '@liaison/entity';
import {hasOwnProperty, isPrototypeOf} from 'core-helpers';
import isPlainObject from 'lodash/isPlainObject';
import mapKeys from 'lodash/mapKeys';
import ow from 'ow';

import {isStorableProperty} from './storable-property';
import {StorableAttribute, isStorableAttribute} from './storable-attribute';
import {StorableMethod} from './storable-method';
import {StorablePrimaryIdentifierAttribute} from './storable-primary-identifier-attribute';
import {StorableSecondaryIdentifierAttribute} from './storable-secondary-identifier-attribute';
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

    static getPropertyClass(type) {
      ow(type, 'type', ow.string.nonEmpty);

      if (type === 'storableAttribute') {
        return StorableAttribute;
      }

      if (type === 'storableMethod') {
        return StorableMethod;
      }

      if (type === 'storablePrimaryIdentifierAttribute') {
        return StorablePrimaryIdentifierAttribute;
      }

      if (type === 'storableSecondaryIdentifierAttribute') {
        return StorableSecondaryIdentifierAttribute;
      }

      return super.getPropertyClass(type);
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

    // === Storable attributes ===

    getStorableAttributesWithLoader(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({attributeSelector: ow, setAttributesOnly: ow.optional.boolean})
      );

      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes({
        filter: attribute => isStorableAttribute(attribute) && attribute.hasLoader(),
        attributeSelector,
        setAttributesOnly
      });
    }

    getStorablePropertiesWithFinder() {
      return this.getProperties({
        filter: property => isStorableProperty(property) && property.hasFinder()
      });
    }

    getStorableComputedAttributes(options = {}) {
      ow(
        options,
        'options',
        ow.object.exactShape({attributeSelector: ow, setAttributesOnly: ow.optional.boolean})
      );

      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes({
        filter: attribute => isStorableAttribute(attribute) && attribute.isComputed(),
        attributeSelector,
        setAttributesOnly
      });
    }

    getStorableAttributesWithHook(name, options = {}) {
      ow(name, 'name', ow.string.nonEmpty);
      ow(
        options,
        'options',
        ow.object.exactShape({attributeSelector: ow, setAttributesOnly: ow.optional.boolean})
      );

      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes({
        filter: attribute => isStorableAttribute(attribute) && attribute.hasHook(name),
        attributeSelector,
        setAttributesOnly
      });
    }

    // === Storage operations ===

    // --- Classes ---

    @method() static async load() {
      // ...
    }

    static async reload() {
      // ...
    }

    @method() static async save() {
      // ...
    }

    @method() static async delete() {
      // ...
    }

    // --- Instances ---

    static async get(identifierDescriptor, attributeSelector = true, options = {}) {
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

      const storable = this.instantiate(identifierDescriptor);

      return await storable.load(attributeSelector, {reload, throwIfMissing, _callerMethodName});
    }

    static async has(identifierDescriptor, options = {}) {
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

      const computedAttributes = this.getStorableComputedAttributes({attributeSelector});
      const nonComputedAttributeSelector = AttributeSelector.remove(
        attributeSelector,
        AttributeSelector.fromAttributes(computedAttributes)
      );

      await this.beforeLoad(nonComputedAttributeSelector);

      let loadedStorable;

      if (this.constructor.hasStore()) {
        loadedStorable = await this.__loadFromStore(nonComputedAttributeSelector, {throwIfMissing});
      } else if (super.load !== undefined) {
        loadedStorable = await super.load(nonComputedAttributeSelector, {reload, throwIfMissing});
      } else {
        throw new Error(
          `To be able to execute the load() method${describeCaller(
            _callerMethodName
          )}, ${this.describeComponentType()} should be registered in a store or have an exposed load() remote method (${this.describeComponent()})`
        );
      }

      if (loadedStorable === undefined) {
        return undefined;
      }

      for (const attribute of loadedStorable.getStorableAttributesWithLoader({attributeSelector})) {
        const value = await attribute.callLoader();

        attribute.setValue(value);
      }

      await loadedStorable.afterLoad(nonComputedAttributeSelector);

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

    async reload(attributeSelector = true, options = {}) {
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

      attributeSelector = this.expandAttributeSelector(attributeSelector);

      const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

      if (throwIfMissing === true && throwIfExists === true) {
        throw new Error(
          "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
        );
      }

      const computedAttributes = this.getStorableComputedAttributes({attributeSelector});
      const nonComputedAttributeSelector = AttributeSelector.remove(
        attributeSelector,
        AttributeSelector.fromAttributes(computedAttributes)
      );

      await this.beforeSave(nonComputedAttributeSelector);

      let savedStorable;

      if (this.constructor.hasStore()) {
        savedStorable = await this.__saveToStore(nonComputedAttributeSelector, {
          throwIfMissing,
          throwIfExists
        });
      } else if (super.save !== undefined) {
        savedStorable = await super.save(nonComputedAttributeSelector, {
          throwIfMissing,
          throwIfExists
        });
      } else {
        throw new Error(
          `To be able to execute the save() method, ${this.describeComponentType()} should be registered in a store or have an exposed save() remote method (${this.describeComponent()})`
        );
      }

      if (savedStorable === undefined) {
        return undefined;
      }

      await this.afterSave(nonComputedAttributeSelector);

      return savedStorable;
    }

    async __saveToStore(attributeSelector, {throwIfMissing, throwIfExists}) {
      this.validate(attributeSelector);

      const store = this.constructor.getStore();

      const storableName = this.getComponentName();
      const identifierDescriptor = this.getIdentifierDescriptor();
      const isNew = this.isNew();

      const serializedStorable = this.serialize({attributeSelector, includeIsNewMark: false});

      const wasSaved = await store.save(
        {storableName, identifierDescriptor, serializedStorable, isNew},
        {throwIfMissing, throwIfExists}
      );

      if (!wasSaved) {
        return undefined;
      }

      if (isNew) {
        this.markAsNotNew();
      }

      return this;
    }

    @method() async delete(options = {}) {
      ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

      if (this.isNew()) {
        throw new Error(
          `Cannot delete ${this.describeComponentType()} that is new (${this.describeComponent()})`
        );
      }

      const {throwIfMissing = true} = options;

      const attributeSelector = this.expandAttributeSelector(true);
      const computedAttributes = this.getStorableComputedAttributes({attributeSelector});
      const nonComputedAttributeSelector = AttributeSelector.remove(
        attributeSelector,
        AttributeSelector.fromAttributes(computedAttributes)
      );

      await this.beforeDelete(nonComputedAttributeSelector);

      let deletedStorable;

      if (this.constructor.hasStore()) {
        deletedStorable = await this.__deleteFromStore({throwIfMissing});
      } else if (super.delete !== undefined) {
        deletedStorable = await super.delete({throwIfMissing});
      } else {
        throw new Error(
          `To be able to execute the delete() method, ${this.describeComponentType()} should be registered in a store or have an exposed delete() remote method (${this.describeComponent()})`
        );
      }

      if (deletedStorable === undefined) {
        return undefined;
      }

      await this.afterDelete(nonComputedAttributeSelector);

      // TODO: deletedStorable.detach();

      return deletedStorable;
    }

    async __deleteFromStore({throwIfMissing}) {
      const store = this.constructor.getStore();

      const storableName = this.getComponentName();
      const identifierDescriptor = this.getIdentifierDescriptor();

      const wasDeleted = await store.delete({storableName, identifierDescriptor}, {throwIfMissing});

      if (!wasDeleted) {
        return undefined;
      }

      return this;
    }

    @method() static async find(query = {}, attributeSelector = true, options = {}) {
      ow(query, 'query', ow.object);
      ow(
        options,
        'options',
        ow.object.exactShape({
          sort: ow.optional.object,
          skip: ow.optional.number,
          limit: ow.optional.number,
          reload: ow.optional.boolean
        })
      );

      const {sort, skip, limit, reload = false} = options;

      query = await this.__callStorablePropertyFindersForQuery(query);

      let foundStorables;

      if (this.hasStore()) {
        foundStorables = await this.__findInStore(query, {sort, skip, limit});
      } else if (super.find !== undefined) {
        foundStorables = await super.find(query, {}, {sort, skip, limit});
      } else {
        throw new Error(
          `To be able to execute the find() method, ${this.describeComponentType()} should be registered in a store or have an exposed find() remote method (${this.describeComponent()})`
        );
      }

      const loadedStorables = [];

      // TODO: Batch loading
      for (const foundStorable of foundStorables) {
        const loadedStorable = await foundStorable.load(attributeSelector, {
          reload,
          _callerMethodName: 'find'
        });
        loadedStorables.push(loadedStorable);
      }

      return foundStorables;
    }

    static async __findInStore(query, {sort, skip, limit}) {
      query = this.__normalizeQuery(query);

      const store = this.getStore();

      const storableName = this.prototype.getComponentName();

      const serializedQuery = this.__serializeQuery(query);

      const primaryIdentifierAttribute = this.prototype.getPrimaryIdentifierAttribute();
      const attributeSelector = {[primaryIdentifierAttribute.getName()]: true};

      const serializedStorables = await store.find(
        {storableName, query: serializedQuery, sort, skip, limit},
        {attributeSelector}
      );

      const foundStorables = serializedStorables.map(serializedStorable => {
        const {identifierAttributes, otherAttributes} = this.prototype.__partitionAttributes(
          serializedStorable
        );
        return this.instantiate(identifierAttributes).deserialize(otherAttributes);
      });

      return foundStorables;
    }

    @method() static async count(query = {}) {
      ow(query, 'query', ow.object);

      query = await this.__callStorablePropertyFindersForQuery(query);

      let storablesCount;

      if (this.hasStore()) {
        storablesCount = await this.__countInStore(query);
      } else if (super.count !== undefined) {
        storablesCount = await super.count(query);
      } else {
        throw new Error(
          `To be able to execute the count() method, ${this.describeComponentType()} should be registered in a store or have an exposed count() remote method (${this.describeComponent()})`
        );
      }

      return storablesCount;
    }

    static async __countInStore(query) {
      query = this.__normalizeQuery(query);

      const store = this.getStore();

      const storableName = this.prototype.getComponentName();

      const serializedQuery = this.__serializeQuery(query);

      const storablesCount = await store.count({storableName, query: serializedQuery});

      return storablesCount;
    }

    static async __callStorablePropertyFindersForQuery(query) {
      for (const property of this.prototype.getStorablePropertiesWithFinder()) {
        const name = property.getName();

        if (!hasOwnProperty(query, name)) {
          continue; // The property finder is not used in the query
        }

        const {[name]: value, ...remainingQuery} = query;

        const finderQuery = await property.callFinder(value);

        query = {...remainingQuery, ...finderQuery};
      }

      return query;
    }

    static __normalizeQuery(query) {
      const normalizeQueryForComponent = function(query, component) {
        if (isComponentClassOrInstance(query)) {
          if (component === query || isPrototypeOf(component, query)) {
            return query;
          }

          throw new Error(
            `An unexpected component was specified in a query (${component.describeComponent({
              includeLayer: false,
              componentSuffix: 'expected'
            })}, ${query.describeComponent({includeLayer: false, componentSuffix: 'specified'})})`
          );
        }

        if (!isPlainObject(query)) {
          throw new Error(
            `Expected a plain object in a query, but received a value of type '${getTypeOf(query)}'`
          );
        }

        const normalizedQuery = {};

        for (const [name, subquery] of Object.entries(query)) {
          if (name === '$not') {
            normalizedQuery[name] = normalizeQueryForComponent(subquery, component);
            continue;
          }

          if (name === '$and' || name === '$or' || name === '$nor') {
            if (!Array.isArray(subquery)) {
              throw new Error(
                `Expected an array as value of the operator '${name}', but received a value of type '${getTypeOf(
                  subquery
                )}'`
              );
            }

            const subqueries = subquery;
            normalizedQuery[name] = subqueries.map(subquery =>
              normalizeQueryForComponent(subquery, component)
            );
            continue;
          }

          const attribute = component.getAttribute(name);

          normalizedQuery[name] = normalizeQueryForAttribute(subquery, attribute);
        }

        return normalizedQuery;
      };

      const normalizeQueryForAttribute = function(query, attribute) {
        if (!isModelAttribute(attribute)) {
          // Since we cannot determine the type of a non-model attribute,
          // there is nothing we can do with the query
          return query;
        }

        const modelAttribute = attribute;
        const type = modelAttribute.getType();

        return normalizeQueryForAttributeAndType(query, modelAttribute, type);
      };

      const normalizeQueryForAttributeAndType = function(query, attribute, type) {
        if (isComponentType(type)) {
          const component = type.getComponentForAttribute(attribute);

          const normalizedQuery = normalizeQueryForComponent(query, component);

          return normalizedQuery;
        }

        if (isArrayType(type)) {
          const itemType = type.getItemType();

          let normalizedQuery = normalizeQueryForAttributeAndType(query, attribute, itemType);

          if (
            isPlainObject(normalizedQuery) &&
            ('$includes' in normalizedQuery || '$include' in normalizedQuery)
          ) {
            // Make '$includes' an alias of '$some'
            normalizedQuery = mapKeys(normalizedQuery, (_value, key) =>
              key === '$includes' || key === '$include' ? '$some' : key
            );
          }

          if (
            !(
              isPlainObject(normalizedQuery) &&
              ('$some' in normalizedQuery ||
                '$every' in normalizedQuery ||
                '$length' in normalizedQuery ||
                '$size' in normalizedQuery)
            )
          ) {
            // Make '$some' implicit
            normalizedQuery = {$some: normalizedQuery};
          }

          return normalizedQuery;
        }

        return query;
      };

      return normalizeQueryForComponent(query, this.prototype);
    }

    static __serializeQuery(query) {
      return serialize(query, {includeComponentName: false, includeIsNewMark: false});
    }

    // === Hooks ===

    async beforeLoad(attributeSelector) {
      await this.__callStorableAttributeHooks('beforeLoad', {attributeSelector});
    }

    async afterLoad(attributeSelector) {
      await this.__callStorableAttributeHooks('afterLoad', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async beforeSave(attributeSelector) {
      await this.__callStorableAttributeHooks('beforeSave', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async afterSave(attributeSelector) {
      await this.__callStorableAttributeHooks('afterSave', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async beforeDelete(attributeSelector) {
      await this.__callStorableAttributeHooks('beforeDelete', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async afterDelete(attributeSelector) {
      await this.__callStorableAttributeHooks('afterDelete', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async __callStorableAttributeHooks(name, {attributeSelector, setAttributesOnly}) {
      for (const attribute of this.getStorableAttributesWithHook(name, {
        attributeSelector,
        setAttributesOnly
      })) {
        await attribute.callHook(name);
      }
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
