import {
  Component,
  ensureComponentClass,
  assertIsComponentClass,
  assertIsComponentType,
  getComponentNameFromComponentClassType,
  getComponentNameFromComponentInstanceType,
  NormalizedIdentifierDescriptor,
  AttributeSelector,
  normalizeAttributeSelector,
  pickFromAttributeSelector
} from '@liaison/component';
import {isPlainObject, deleteUndefinedProperties, assertNoUnknownOptions} from 'core-helpers';
import {serialize, deserialize} from 'simple-serialization';

import {StorableLike, isStorableLikeClass, assertIsStorableLikeClass} from './storable-like';
import {
  Document,
  AttributeValue,
  Projection,
  buildProjection,
  DocumentPatch,
  buildDocumentPatch
} from './document';
import type {Query} from './query';
import type {Expression} from './expression';
import {Operator, looksLikeOperator, normalizeOperatorForValue} from './operator';
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

export type SortDescriptor = {[name: string]: SortDirection};

export type SortDirection = 'asc' | 'desc';

export abstract class AbstractStore {
  constructor(rootComponent?: typeof Component, options = {}) {
    assertNoUnknownOptions(options);

    if (rootComponent !== undefined) {
      this.registerRootComponent(rootComponent);
    }
  }

  // === Root components ===

  _rootComponents = new Set<typeof Component>();

  registerRootComponent(rootComponent: typeof Component) {
    assertIsComponentClass(rootComponent);

    this._rootComponents.add(rootComponent);

    let storableCount = 0;

    const registerIfComponentIsStorable = (component: typeof Component) => {
      if (isStorableLikeClass(component)) {
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

  getRootComponents() {
    return this._rootComponents.values();
  }

  // === Storables ===

  _storables = new Map<string, typeof StorableLike>();

  getStorable(name: string) {
    const storable = this._getStorable(name);

    if (storable !== undefined) {
      return storable;
    }

    throw new Error(`The storable component '${name}' is not registered in the store`);
  }

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

  registerStorable(storable: typeof StorableLike) {
    assertIsStorableLikeClass(storable);

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

  getStorables() {
    return this._storables.values();
  }

  // === Collections ===

  _getCollectionNameFromStorable(storable: typeof StorableLike | StorableLike) {
    return ensureComponentClass(storable).getComponentName();
  }

  // === Documents ===

  async load(
    params: {storableType: string; identifierDescriptor: NormalizedIdentifierDescriptor},
    options: {attributeSelector?: AttributeSelector; throwIfMissing?: boolean} = {}
  ) {
    const {storableType, identifierDescriptor} = params;
    let {attributeSelector = true, throwIfMissing = true} = options;

    attributeSelector = normalizeAttributeSelector(attributeSelector);

    const storable = this.getStorableOfType(storableType);
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

      return serializedStorable;
    }

    if (!throwIfMissing) {
      return undefined;
    }

    throw new Error(
      `Cannot load a document that is missing from the store (collection: '${collectionName}', ${ensureComponentClass(
        storable
      ).describeIdentifierDescriptor(identifierDescriptor)})`
    );
  }

  async save(
    params: {
      storableType: string;
      identifierDescriptor: NormalizedIdentifierDescriptor;
      serializedStorable: object;
      isNew?: boolean;
    },
    options: {throwIfMissing?: boolean; throwIfExists?: boolean} = {}
  ) {
    const {storableType, identifierDescriptor, serializedStorable, isNew = false} = params;
    const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

    if (throwIfMissing === true && throwIfExists === true) {
      throw new Error(
        "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
      );
    }

    const storable = this.getStorableOfType(storableType);
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);
    const document = this.toDocument(storable, serializedStorable);

    let wasSaved: boolean;

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

    if (!wasSaved) {
      if (throwIfMissing) {
        throw new Error(
          `Cannot save a non-new document that is missing from the store (collection: '${collectionName}', ${ensureComponentClass(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }

      if (throwIfExists) {
        throw new Error(
          `Cannot save a new document that already exists in the store (collection: '${collectionName}', ${ensureComponentClass(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }
    }

    return wasSaved;
  }

  async delete(
    params: {storableType: string; identifierDescriptor: NormalizedIdentifierDescriptor},
    options: {throwIfMissing?: boolean} = {}
  ) {
    const {storableType, identifierDescriptor} = params;
    const {throwIfMissing = true} = options;

    const storable = this.getStorableOfType(storableType);
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);

    const wasDeleted = await this.deleteDocument({
      collectionName,
      identifierDescriptor: documentIdentifierDescriptor
    });

    if (!wasDeleted) {
      if (throwIfMissing) {
        throw new Error(
          `Cannot delete a document that is missing from the store (collection: '${collectionName}', ${ensureComponentClass(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }
    }

    return wasDeleted;
  }

  async find(
    params: {
      storableType: string;
      query?: Query;
      sort?: SortDescriptor;
      skip?: number;
      limit?: number;
    },
    options: {attributeSelector?: AttributeSelector} = {}
  ) {
    const {storableType, query = {}, sort = {}, skip, limit} = params;
    let {attributeSelector = true} = options;

    attributeSelector = normalizeAttributeSelector(attributeSelector);

    const storable = this.getStorableOfType(storableType);
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentExpressions = this.toDocumentExpressions(storable, query);
    const documentSort = this.toDocument(storable, sort);
    const documentAttributeSelector = this.toDocument(storable, attributeSelector);
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

    const serializedStorables = documents.map((document) => this.fromDocument(storable, document));

    return serializedStorables;
  }

  async count(params: {storableType: string; query?: Query}) {
    const {storableType, query = {}} = params;

    const storable = this.getStorableOfType(storableType);
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentExpressions = this.toDocumentExpressions(storable, query);

    const documentsCount = await this.countDocuments({
      collectionName,
      expressions: documentExpressions
    });

    return documentsCount;
  }

  // === Abstract document operations ===

  abstract async createDocument({
    collectionName,
    identifierDescriptor,
    document
  }: CreateDocumentParams): Promise<boolean>;

  abstract async readDocument({
    collectionName,
    identifierDescriptor,
    projection
  }: ReadDocumentParams): Promise<Document | undefined>;

  abstract async updateDocument({
    collectionName,
    identifierDescriptor,
    documentPatch
  }: UpdateDocumentParams): Promise<boolean>;

  abstract async deleteDocument({
    collectionName,
    identifierDescriptor
  }: DeleteDocumentParams): Promise<boolean>;

  abstract async findDocuments({
    collectionName,
    expressions,
    projection,
    sort,
    skip,
    limit
  }: FindDocumentsParams): Promise<Document[]>;

  abstract async countDocuments({
    collectionName,
    expressions
  }: CountDocumentsParams): Promise<number>;

  // === Serialization ===

  toDocument<Value>(_storable: typeof StorableLike | StorableLike, value: Value) {
    return deserialize(value) as Value;
  }

  // {a: 1, b: {c: 2}} => [['a', '$equal', 1], ['b.c', '$equal', 2]]
  toDocumentExpressions(storable: typeof StorableLike | StorableLike, query: Query) {
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

  fromDocument(_storable: typeof StorableLike | StorableLike, document: Document): Document {
    return serialize(document);
  }

  // === Utilities ===

  static isStore(value: any): value is AbstractStore {
    return isStoreInstance(value);
  }
}
