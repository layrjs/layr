import {
  Component,
  isComponentInstance,
  ensureComponentClass,
  assertIsComponentClass,
  assertIsComponentType,
  getComponentNameFromComponentClassType,
  getComponentNameFromComponentInstanceType,
  NormalizedIdentifierDescriptor,
  AttributeSelector,
  createAttributeSelectorFromNames,
  pickFromAttributeSelector,
  mergeAttributeSelectors,
  isIdentifierAttributeInstance,
  isPrimaryIdentifierAttributeInstance,
  isComponentValueTypeInstance
} from '@layr/component';
import {
  StorableComponent,
  isStorableClass,
  assertIsStorableClass,
  Query,
  SortDescriptor,
  SortDirection,
  Operator,
  looksLikeOperator,
  normalizeOperatorForValue
} from '@layr/storable';
import {
  isPlainObject,
  deleteUndefinedProperties,
  assertNoUnknownOptions,
  PromiseLikeValue
} from 'core-helpers';
import {serialize, deserialize} from 'simple-serialization';
import mapKeys from 'lodash/mapKeys';

import {
  Document,
  AttributeValue,
  Projection,
  buildProjection,
  DocumentPatch,
  buildDocumentPatch
} from './document';
import type {Expression} from './expression';
import type {Path} from './path';
import {isStoreInstance} from './utilities';

export type CreateDocumentParams = {
  collectionName: string;
  identifierDescriptor: NormalizedIdentifierDescriptor;
  document: Document;
};

export type ReadDocumentParams = {
  collectionName: string;
  identifierDescriptor: NormalizedIdentifierDescriptor;
  projection?: Projection;
};

export type UpdateDocumentParams = {
  collectionName: string;
  identifierDescriptor: NormalizedIdentifierDescriptor;
  documentPatch: DocumentPatch;
};

export type DeleteDocumentParams = {
  collectionName: string;
  identifierDescriptor: NormalizedIdentifierDescriptor;
};

export type FindDocumentsParams = {
  collectionName: string;
  expressions: Expression[];
  projection?: Projection;
  sort?: SortDescriptor;
  skip?: number;
  limit?: number;
};

export type CountDocumentsParams = {
  collectionName: string;
  expressions: Expression[];
};

export type MigrateCollectionParams = {
  collectionName: string;
  collectionSchema: CollectionSchema;
  silent?: boolean;
};

export type MigrateCollectionResult = {
  name: string;
  createdIndexes: string[];
  droppedIndexes: string[];
};

export type CollectionSchema = {
  indexes: CollectionIndex[];
};

export type CollectionIndex = {
  attributes: {[name: string]: SortDirection};
  isPrimary: boolean;
  isUnique: boolean;
};

export type TraceEntry = {
  operation: string;
  params: any[];
  result?: any;
  error?: any;
};

/**
 * An abstract class from which classes such as [`MongoDBStore`](https://layrjs.com/docs/v1/reference/mongodb-store) or [`MemoryStore`](https://layrjs.com/docs/v1/reference/memory-store) are constructed. Unless you build a custom store, you probably won't have to use this class directly.
 */
export abstract class Store {
  constructor(options = {}) {
    assertNoUnknownOptions(options);
  }

  // === Root components ===

  _rootComponents = new Set<typeof Component>();

  /**
   * Registers all the [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class) that are provided (directly or recursively) by the specified root component.
   *
   * @param rootComponent A [`Component`](https://layrjs.com/docs/v1/reference/component) class.
   *
   * @example
   * ```
   * import {Component} from '﹫layr/component';
   * import {Storable} from '﹫layr/storable';
   * import {MongoDBStore} from '﹫layr/mongodb-store';
   *
   * class User extends Storable(Component) {
   *   // ...
   * }
   *
   * class Movie extends Storable(Component) {
   *   // ...
   * }
   *
   * class Backend extends Component {
   *   ﹫provide() static User = User;
   *   ﹫provide() static Movie = Movie;
   * }
   *
   * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
   *
   * store.registerRootComponent(Backend); // User and Movie will be registered
   * ```
   *
   * @category Component Registration
   */
  registerRootComponent(rootComponent: typeof Component) {
    assertIsComponentClass(rootComponent);

    this._rootComponents.add(rootComponent);

    let storableCount = 0;

    const registerIfComponentIsStorable = (component: typeof Component) => {
      if (isStorableClass(component)) {
        this.registerStorable(component);
        storableCount++;
      }
    };

    registerIfComponentIsStorable(rootComponent);

    for (const providedComponent of rootComponent.getProvidedComponents({deep: true})) {
      registerIfComponentIsStorable(providedComponent);
    }

    if (storableCount === 0) {
      throw new Error(
        `No storable components were found from the specified root component '${rootComponent.describeComponent()}'`
      );
    }
  }

  /**
   * Gets all the root components that are registered into the store.
   *
   * @returns An iterator of [`Component`](https://layrjs.com/docs/v1/reference/component) classes.
   *
   * @category Component Registration
   */
  getRootComponents() {
    return this._rootComponents.values();
  }

  // === Storables ===

  _storables = new Map<string, typeof StorableComponent>();

  /**
   * Gets a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) that is registered into the store. An error is thrown if there is no storable component with the specified name.
   *
   * @param name The name of the storable component to get.
   *
   * @returns A [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class) class.
   *
   * @example
   * ```
   * // See the definition of `store` in the `registerRootComponent()` example
   *
   * store.getStorable('Movie'); // => Movie class
   * store.getStorable('User'); // => User class
   * store.getStorable('Film'); // => Error
   * ```
   *
   * @category Component Registration
   */
  getStorable(name: string) {
    const storable = this._getStorable(name);

    if (storable !== undefined) {
      return storable;
    }

    throw new Error(`The storable component '${name}' is not registered in the store`);
  }

  /**
   * Returns whether a [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) is registered into the store.
   *
   * @param name The name of the storable component to check.
   *
   * @returns A boolean.
   *
   * @example
   * ```
   * // See the definition of `store` in the `registerRootComponent()` example
   *
   * store.hasStorable('Movie'); // => true
   * store.hasStorable('User'); // => true
   * store.hasStorable('Film'); // => false
   * ```
   *
   * @category Component Registration
   */
  hasStorable(name: string) {
    return this._getStorable(name) !== undefined;
  }

  _getStorable(name: string) {
    return this._storables.get(name);
  }

  getStorableOfType(type: string) {
    const storable = this._getStorableOfType(type);

    if (storable !== undefined) {
      return storable;
    }

    throw new Error(`The storable component of type '${type}' is not registered in the store`);
  }

  _getStorableOfType(type: string) {
    const isComponentClassType = assertIsComponentType(type) === 'componentClassType';

    const componentName = isComponentClassType
      ? getComponentNameFromComponentClassType(type)
      : getComponentNameFromComponentInstanceType(type);

    const component = this._getStorable(componentName);

    if (component === undefined) {
      return undefined;
    }

    return isComponentClassType ? component : component.prototype;
  }

  /**
   * Registers a specific [storable component](https://layrjs.com/docs/v1/reference/storable#storable-component-class) into the store. Typically, instead of using this method, you would rather use the [`registerRootComponent()`](https://layrjs.com/docs/v1/reference/store#register-root-component-instance-method) method to register multiple storable components at once.
   *
   * @param storable The [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class) class to register.
   *
   * @example
   * ```
   * class Movie extends Storable(Component) {
   *   // ...
   * }
   *
   * const store = new MongoDBStore('mongodb://user:pass@host:port/db');
   *
   * store.registerStorable(Movie);
   * ```
   *
   * @category Component Registration
   */
  registerStorable(storable: typeof StorableComponent) {
    assertIsStorableClass(storable);

    if (storable.hasStore()) {
      if (storable.getStore() === this) {
        return;
      }

      throw new Error(
        `Cannot register a storable component that is already registered in another store (${storable.describeComponent()})`
      );
    }

    const storableName = storable.getComponentName();

    const existingStorable = this._storables.get(storableName);

    if (existingStorable !== undefined) {
      throw new Error(
        `A storable component with the same name is already registered (${existingStorable.describeComponent()})`
      );
    }

    storable.__setStore(this);

    this._storables.set(storableName, storable);
  }

  /**
   * Gets all the [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class) that are registered into the store.
   *
   * @returns An iterator of [`StorableComponent`](https://layrjs.com/docs/v1/reference/storable#storable-component-class) classes.
   *
   * @category Component Registration
   */
  getStorables() {
    return this._storables.values();
  }

  // === Collections ===

  _getCollectionNameFromStorable(storable: typeof StorableComponent | StorableComponent) {
    return ensureComponentClass(storable).getComponentName();
  }

  // === Storable operations ===

  async load(
    storable: StorableComponent,
    options: {attributeSelector?: AttributeSelector; throwIfMissing?: boolean} = {}
  ) {
    return await this._runOperation('load', [storable, options], async () => {
      let {attributeSelector = true, throwIfMissing = true} = options;

      const identifierDescriptor = storable.getIdentifierDescriptor();

      // Always include the identifier attribute
      const identifierAttributeSelector = createAttributeSelectorFromNames(
        Object.keys(identifierDescriptor)
      );
      attributeSelector = mergeAttributeSelectors(attributeSelector, identifierAttributeSelector);

      const collectionName = this._getCollectionNameFromStorable(storable);

      const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);
      const documentAttributeSelector = this.toDocument(storable, attributeSelector);
      const projection = buildProjection(documentAttributeSelector);

      let document = await this.readDocument({
        collectionName,
        identifierDescriptor: documentIdentifierDescriptor,
        projection
      });

      if (document !== undefined) {
        document = pickFromAttributeSelector(document, documentAttributeSelector, {
          includeAttributeNames: ['__component']
        });

        const serializedStorable = this.fromDocument(storable, document);

        const loadedStorable = storable.deserialize(serializedStorable, {source: 1});

        return loadedStorable;
      }

      if (!throwIfMissing) {
        return undefined;
      }

      throw Object.assign(
        new Error(
          `Cannot load a component that is missing from the store (${storable.describeComponent()}, ${ensureComponentClass(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        ),
        {code: 'COMPONENT_IS_MISSING_FROM_STORE', expose: true}
      );
    });
  }

  async save(
    storable: StorableComponent,
    options: {
      attributeSelector?: AttributeSelector;
      throwIfMissing?: boolean;
      throwIfExists?: boolean;
    } = {}
  ) {
    return await this._runOperation('save', [storable, options], async () => {
      const isNew = storable.isNew();

      const {attributeSelector = true, throwIfMissing = !isNew, throwIfExists = isNew} = options;

      if (throwIfMissing === true && throwIfExists === true) {
        throw new Error(
          "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
        );
      }

      storable._assertArrayItemsAreFullyLoaded(attributeSelector);

      storable.validate(attributeSelector);

      const collectionName = this._getCollectionNameFromStorable(storable);

      const identifierDescriptor = storable.getIdentifierDescriptor();
      const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);

      const serializedStorable = storable.serialize({attributeSelector, includeIsNewMarks: false})!;
      const document = this.toDocument(storable, serializedStorable);

      let wasSaved: boolean;

      try {
        if (isNew) {
          deleteUndefinedProperties(document);

          wasSaved = await this.createDocument({
            collectionName,
            identifierDescriptor: documentIdentifierDescriptor,
            document
          });
        } else {
          const documentPatch = buildDocumentPatch(document);

          wasSaved = await this.updateDocument({
            collectionName,
            identifierDescriptor: documentIdentifierDescriptor,
            documentPatch
          });
        }
      } catch (error) {
        const {code, indexName} = error;

        if (code === 'DUPLICATE_KEY_ERROR') {
          throw Object.assign(
            new Error(
              `Cannot save a component with an attribute value that should be unique but already exists in the store (${storable.describeComponent()}, ${ensureComponentClass(
                storable
              ).describeIdentifierDescriptor(identifierDescriptor)}, index: '${indexName}')`
            ),
            {code: 'UNIQUE_ATTRIBUTE_ALREADY_EXISTS_IN_STORE', indexName, expose: true}
          );
        }

        throw error;
      }

      if (!wasSaved) {
        if (throwIfMissing) {
          throw Object.assign(
            new Error(
              `Cannot save a non-new component that is missing from the store (${storable.describeComponent()}, ${ensureComponentClass(
                storable
              ).describeIdentifierDescriptor(identifierDescriptor)})`
            ),
            {code: 'COMPONENT_IS_MISSING_FROM_STORE', expose: true}
          );
        }

        if (throwIfExists) {
          throw Object.assign(
            new Error(
              `Cannot save a new component that already exists in the store (${storable.describeComponent()}, ${ensureComponentClass(
                storable
              ).describeIdentifierDescriptor(identifierDescriptor)})`
            ),
            {code: 'COMPONENT_ALREADY_EXISTS_IN_STORE', expose: true}
          );
        }

        return undefined;
      }

      if (isNew) {
        storable.markAsNotNew(); // TODO: Mark also embedded components as not new
      }

      storable.traverseAttributes(
        (attribute) => {
          attribute.setValueSource(1);
        },
        {attributeSelector, setAttributesOnly: true}
      );

      return storable;
    });
  }

  async delete(storable: StorableComponent, options: {throwIfMissing?: boolean} = {}) {
    return await this._runOperation('delete', [storable, options], async () => {
      const {throwIfMissing = true} = options;

      const collectionName = this._getCollectionNameFromStorable(storable);

      const identifierDescriptor = storable.getIdentifierDescriptor();
      const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);

      const wasDeleted = await this.deleteDocument({
        collectionName,
        identifierDescriptor: documentIdentifierDescriptor
      });

      if (!wasDeleted) {
        if (throwIfMissing) {
          throw Object.assign(
            new Error(
              `Cannot delete a component that is missing from the store (${storable.describeComponent()}, ${ensureComponentClass(
                storable
              ).describeIdentifierDescriptor(identifierDescriptor)})`
            ),
            {code: 'COMPONENT_IS_MISSING_FROM_STORE', expose: true}
          );
        }

        return undefined;
      }

      return storable;
    });
  }

  async find(
    storable: typeof StorableComponent,
    query: Query = {},
    options: {sort?: SortDescriptor; skip?: number; limit?: number} = {}
  ) {
    return await this._runOperation('find', [storable, query, options], async () => {
      const {sort = {}, skip, limit} = options;

      const storablePrototype = storable.prototype;

      const collectionName = this._getCollectionNameFromStorable(storablePrototype);

      const serializedQuery = serialize(query);
      const documentExpressions = this.toDocumentExpressions(storablePrototype, serializedQuery);

      const documentSort = this.toDocument(storablePrototype, sort);

      const primaryIdentifierAttribute = storablePrototype.getPrimaryIdentifierAttribute();
      const attributeSelector = {[primaryIdentifierAttribute.getName()]: true};
      const documentAttributeSelector = this.toDocument(storablePrototype, attributeSelector);
      const projection = buildProjection(documentAttributeSelector);

      let documents = await this.findDocuments({
        collectionName,
        expressions: documentExpressions,
        projection,
        sort: documentSort,
        skip,
        limit
      });

      documents = documents.map((document) =>
        pickFromAttributeSelector(document, documentAttributeSelector, {
          includeAttributeNames: ['__component']
        })
      );

      const serializedStorables = documents.map((document) =>
        this.fromDocument(storable, document)
      );

      const foundStorables: StorableComponent[] = [];

      for (const serializedStorable of serializedStorables) {
        foundStorables.push(await storable.recreate(serializedStorable, {source: 1}));
      }

      return foundStorables;
    });
  }

  async count(storable: typeof StorableComponent, query: Query = {}) {
    return await this._runOperation('count', [storable, query], async () => {
      const storablePrototype = storable.prototype;

      const collectionName = this._getCollectionNameFromStorable(storablePrototype);

      const serializedQuery = serialize(query);
      const documentExpressions = this.toDocumentExpressions(storablePrototype, serializedQuery);

      const documentsCount = await this.countDocuments({
        collectionName,
        expressions: documentExpressions
      });

      return documentsCount;
    });
  }

  async _runOperation<
    PromiseResult extends Promise<unknown>,
    Result = PromiseLikeValue<PromiseResult>
  >(operation: string, params: any[], func: () => PromiseResult): Promise<Result> {
    const trace = this._trace;

    try {
      const result = await func();

      if (trace !== undefined) {
        trace.push({operation, params, result});
      }

      return result as Result;
    } catch (error) {
      if (trace !== undefined) {
        trace.push({operation, params, error});
      }

      throw error;
    }
  }

  // === Tracing ===

  _trace: TraceEntry[] | undefined;

  getTrace() {
    const trace = this._trace;

    if (trace === undefined) {
      throw new Error('The store is not currently tracing');
    }

    return trace;
  }

  startTrace() {
    this._trace = [];
  }

  stopTrace() {
    this._trace = undefined;
  }

  // === Abstract collection operations ===

  abstract migrateCollection({
    collectionName,
    collectionSchema,
    silent
  }: MigrateCollectionParams): Promise<MigrateCollectionResult>;

  // === Abstract document operations ===

  abstract createDocument({
    collectionName,
    identifierDescriptor,
    document
  }: CreateDocumentParams): Promise<boolean>;

  abstract readDocument({
    collectionName,
    identifierDescriptor,
    projection
  }: ReadDocumentParams): Promise<Document | undefined>;

  abstract updateDocument({
    collectionName,
    identifierDescriptor,
    documentPatch
  }: UpdateDocumentParams): Promise<boolean>;

  abstract deleteDocument({
    collectionName,
    identifierDescriptor
  }: DeleteDocumentParams): Promise<boolean>;

  abstract findDocuments({
    collectionName,
    expressions,
    projection,
    sort,
    skip,
    limit
  }: FindDocumentsParams): Promise<Document[]>;

  abstract countDocuments({collectionName, expressions}: CountDocumentsParams): Promise<number>;

  // === Serialization ===

  toDocument<Value>(_storable: typeof StorableComponent | StorableComponent, value: Value) {
    return deserialize(value) as Value;
  }

  // {a: 1, b: {c: 2}} => [['a', '$equal', 1], ['b.c', '$equal', 2]]
  toDocumentExpressions(storable: typeof StorableComponent | StorableComponent, query: Query) {
    const documentQuery = this.toDocument(storable, query);

    const build = function (query: Query, expressions: Expression[], path: Path) {
      for (const [name, value] of Object.entries(query)) {
        if (looksLikeOperator(name)) {
          const operator = name;

          if (operator === '$and' || operator === '$or' || operator === '$nor') {
            handleOperator(operator, value, expressions, path, {query});
            continue;
          }

          throw new Error(
            `A query cannot contain the operator '${operator}' at its root (query: ${JSON.stringify(
              query
            )})`
          );
        }

        const subpath: Path = path !== '' ? `${path}.${name}` : name;

        handleValue(value, expressions, subpath, {query});
      }
    };

    const handleValue = function (
      value: AttributeValue | object,
      expressions: Expression[],
      subpath: Path,
      {query}: {query: Query}
    ) {
      if (!isPlainObject(value)) {
        // Make '$equal' the default operator for non object values
        expressions.push([subpath, '$equal', value]);
        return;
      }

      const object = value;

      let objectContainsAttributes = false;
      let objectContainsOperators = false;

      for (const name of Object.keys(object)) {
        if (looksLikeOperator(name)) {
          objectContainsOperators = true;
        } else {
          objectContainsAttributes = true;
        }
      }

      if (objectContainsAttributes) {
        if (objectContainsOperators) {
          throw new Error(
            `A subquery cannot contain both an attribute and an operator (subquery: ${JSON.stringify(
              object
            )})`
          );
        }

        const subquery = object;
        build(subquery, expressions, subpath);
        return;
      }

      if (objectContainsOperators) {
        const operators = object;

        for (const [operator, value] of Object.entries(operators)) {
          handleOperator(operator, value, expressions, subpath, {query});
        }
      }
    };

    const handleOperator = function (
      operator: Operator,
      value: AttributeValue | object,
      expressions: Expression[],
      path: Path,
      {query}: {query: Query}
    ) {
      const normalizedOperator = normalizeOperatorForValue(operator, value, {query});

      if (
        normalizedOperator === '$some' ||
        normalizedOperator === '$every' ||
        normalizedOperator === '$not'
      ) {
        const subexpressions: Expression[] = [];
        handleValue(value, subexpressions, '', {query});
        expressions.push([path, normalizedOperator, subexpressions]);
        return;
      }

      if (
        normalizedOperator === '$and' ||
        normalizedOperator === '$or' ||
        normalizedOperator === '$nor'
      ) {
        const values = value as (AttributeValue | object)[];
        const operatorExpressions = values.map((value) => {
          const subexpressions: Expression[] = [];
          handleValue(value, subexpressions, '', {query});
          return subexpressions;
        });
        expressions.push([path, normalizedOperator, operatorExpressions]);
        return;
      }

      if (isPlainObject(value)) {
        throw new Error(
          `Unexpected object encountered in a query (query: ${JSON.stringify(query)})`
        );
      }

      expressions.push([path, normalizedOperator, value]);
    };

    const documentExpressions: Expression[] = [];
    build(documentQuery, documentExpressions, '');
    return documentExpressions;
  }

  fromDocument(
    _storable: typeof StorableComponent | StorableComponent,
    document: Document
  ): Document {
    return serialize(document);
  }

  // === Migration ===

  /**
   * Migrates the database to reflect all the [storable components](https://layrjs.com/docs/v1/reference/storable#storable-component-class) that are registered into the store.
   *
   * The migration consists in synchronizing the indexes of the database with the indexes that are defined in each storable component (typically using the [`@index()`](https://layrjs.com/docs/v1/reference/storable#index-decorator) decorator).
   *
   * @param [options.silent] A boolean specifying whether the operation should not produce any output in the console (default: `false`).
   *
   * @examplelink See an example of use in the [`Index`](https://layrjs.com/docs/v1/reference/index) class.
   *
   * @category Migration
   */
  async migrateStorables(options: {silent?: boolean} = {}) {
    const {silent = false} = options;

    const allResults: {collections: MigrateCollectionResult[]} = {
      collections: []
    };

    for (const storable of this.getStorables()) {
      const result = await this.migrateStorable(storable, {silent});
      allResults.collections.push(result);
    }

    return allResults;
  }

  async migrateStorable(storable: typeof StorableComponent, options: {silent?: boolean} = {}) {
    const {silent = false} = options;

    const collectionName = this._getCollectionNameFromStorable(storable.prototype);
    const collectionSchema = this.getCollectionSchema(storable.prototype);

    const result = await this.migrateCollection({collectionName, collectionSchema, silent});

    return result;
  }

  getCollectionSchema(storable: StorableComponent) {
    const schema: CollectionSchema = {
      indexes: this._getCollectionIndexes(storable)
    };

    return schema;
  }

  _getCollectionIndexes(storable: StorableComponent) {
    const indexes: CollectionIndex[] = [];

    const resolveAttributeName = (name: string) => {
      // If the the type of the attribute is a referenced component,
      // return the concatenation of attribute name with the referenced component
      // primary identifier attribute name

      const attribute = storable.getAttribute(name);
      const scalarType = attribute.getValueType().getScalarType();

      if (isComponentValueTypeInstance(scalarType)) {
        const component = scalarType.getComponent(attribute);

        if (
          isComponentInstance(component) &&
          !ensureComponentClass(component).isEmbedded() &&
          component.hasPrimaryIdentifierAttribute()
        ) {
          return name + '.' + component.getPrimaryIdentifierAttribute({autoFork: false}).getName();
        }
      }

      return name;
    };

    for (const attribute of storable.getAttributes({autoFork: false})) {
      if (isIdentifierAttributeInstance(attribute)) {
        const attributes = {[attribute.getName()]: 'asc' as SortDirection};
        const isPrimary = isPrimaryIdentifierAttributeInstance(attribute);
        const isUnique = true;

        indexes.push({attributes, isPrimary, isUnique});

        continue;
      }

      const name = attribute.getName();
      const resolvedName = resolveAttributeName(name);

      if (name !== resolvedName) {
        // It means that the type of the attribute is a referenced component
        // with a primary identifier attribute

        const attributes = {[resolvedName]: 'asc' as SortDirection};
        const isPrimary = false;
        const isUnique = false;

        indexes.push({attributes, isPrimary, isUnique});
      }
    }

    for (const index of storable.getIndexes({autoFork: false})) {
      const attributes = mapKeys(index.getAttributes(), (_value, name) =>
        resolveAttributeName(name)
      );
      const isPrimary = false;
      const isUnique = Boolean(index.getOptions().isUnique);

      indexes.push({attributes, isPrimary, isUnique});
    }

    return indexes;
  }

  // === Utilities ===

  static isStore(value: any): value is Store {
    return isStoreInstance(value);
  }
}
