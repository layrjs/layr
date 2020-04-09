import {
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  AttributeSelector,
  getTypeOf
} from '@liaison/component';
import {getClassOf, deleteUndefinedProperties} from 'core-helpers';
import {serialize, deserialize} from 'simple-serialization';
import isPlainObject from 'lodash/isPlainObject';
import upperFirst from 'lodash/upperFirst';
import ow from 'ow';

import {looksLikeOperator, normalizeOperatorForValue} from './operators';
import {isStore} from './utilities';

export class AbstractStore {
  constructor(storables, options = {}) {
    ow(storables, 'storables', ow.optional.array);
    ow(options, 'options', ow.object.exactShape({}));

    this._storables = Object.create(null);

    if (storables !== undefined) {
      for (const Storable of storables) {
        this.registerStorable(Storable);
      }
    }
  }

  static create(storables, options) {
    return new this(storables, options);
  }

  // === Storable registration ===

  getStorable(name, options = {}) {
    ow(name, ow.string.nonEmpty);
    ow(
      options,
      'options',
      ow.object.exactShape({
        throwIfMissing: ow.optional.boolean,
        includePrototypes: ow.optional.boolean
      })
    );

    const {throwIfMissing = true, includePrototypes = false} = options;

    const isInstanceName =
      validateComponentName(name, {
        allowInstances: includePrototypes
      }) === 'componentInstanceName';

    const className = isInstanceName ? getComponentClassNameFromComponentInstanceName(name) : name;

    const Storable = this._storables[className];

    if (Storable === undefined) {
      if (throwIfMissing) {
        throw new Error(`The storable class '${className}' is not registered in the store`);
      }

      return undefined;
    }

    return isInstanceName ? Storable.prototype : Storable;
  }

  registerStorable(Storable) {
    if (typeof Storable?.isStorable !== 'function') {
      throw new Error(
        `Expected a storable class, but received a value of type '${getTypeOf(Storable)}'`
      );
    }

    if (Storable.hasStore()) {
      throw new Error(
        `Cannot register ${Storable.describeComponentType()} that is already registered (${Storable.describeComponent()})`
      );
    }

    const storableName = Storable.getComponentName();

    const existingStorable = this._storables[storableName];

    if (existingStorable !== undefined) {
      throw new Error(
        `${upperFirst(
          Storable.describeComponentType()
        )} with the same name is already registered (${existingStorable.describeComponent()})`
      );
    }

    Storable.__setStore(this);

    this._storables[storableName] = Storable;
  }

  getStorables() {
    return Object.values(this._storables);
  }

  // === Collections ===

  _getCollectionNameFromStorable(storable) {
    return getClassOf(storable).getComponentName();
  }

  // === Documents ===

  async load(params, options = {}) {
    ow(
      params,
      'params',
      ow.object.exactShape({
        storableName: ow.string.nonEmpty,
        identifierDescriptor: ow.object.nonEmpty
      })
    );
    ow(
      options,
      'options',
      ow.object.exactShape({attributeSelector: ow, throwIfMissing: ow.optional.boolean})
    );

    const {storableName, identifierDescriptor} = params;
    let {attributeSelector = true, throwIfMissing = true} = options;

    attributeSelector = AttributeSelector.normalize(attributeSelector);

    const storable = this.getStorable(storableName, {includePrototypes: true});
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
      document = AttributeSelector.pick(document, documentAttributeSelector, {
        includeAttributeNames: ['__component']
      });

      const serializedStorable = this.fromDocument(storable, document);

      return serializedStorable;
    }

    if (throwIfMissing) {
      throw new Error(
        `Cannot load a document that is missing from the store (collection: '${collectionName}', ${getClassOf(
          storable
        ).describeIdentifierDescriptor(identifierDescriptor)})`
      );
    }
  }

  async save(params, options = {}) {
    ow(
      params,
      'params',
      ow.object.exactShape({
        storableName: ow.string.nonEmpty,
        identifierDescriptor: ow.object.nonEmpty,
        serializedStorable: ow.object,
        isNew: ow.optional.boolean
      })
    );
    ow(
      options,
      'options',
      ow.object.exactShape({
        throwIfMissing: ow.optional.boolean,
        throwIfExists: ow.optional.boolean
      })
    );

    const {storableName, identifierDescriptor, serializedStorable, isNew = false} = params;
    const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

    if (throwIfMissing === true && throwIfExists === true) {
      throw new Error(
        "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
      );
    }

    const storable = this.getStorable(storableName, {includePrototypes: true});
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);
    const document = this.toDocument(storable, serializedStorable);

    let wasSaved;

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
          `Cannot save a non-new document that is missing from the store (collection: '${collectionName}', ${getClassOf(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }

      if (throwIfExists) {
        throw new Error(
          `Cannot save a new document that already exists in the store (collection: '${collectionName}', ${getClassOf(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }
    }

    return wasSaved;
  }

  async delete(params, options = {}) {
    ow(
      params,
      'params',
      ow.object.exactShape({
        storableName: ow.string.nonEmpty,
        identifierDescriptor: ow.object.nonEmpty
      })
    );
    ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

    const {storableName, identifierDescriptor} = params;
    const {throwIfMissing = true} = options;

    const storable = this.getStorable(storableName, {includePrototypes: true});
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentIdentifierDescriptor = this.toDocument(storable, identifierDescriptor);

    const wasDeleted = await this.deleteDocument({
      collectionName,
      identifierDescriptor: documentIdentifierDescriptor
    });

    if (!wasDeleted) {
      if (throwIfMissing) {
        throw new Error(
          `Cannot delete a document that is missing from the store (collection: '${collectionName}', ${getClassOf(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }
    }

    return wasDeleted;
  }

  async find(params, options = {}) {
    ow(
      params,
      'params',
      ow.object.exactShape({
        storableName: ow.string.nonEmpty,
        query: ow.optional.object,
        sort: ow.optional.object,
        skip: ow.optional.number,
        limit: ow.optional.number
      })
    );
    ow(options, 'options', ow.object.exactShape({attributeSelector: ow}));

    const {storableName, query = {}, sort = {}, skip, limit} = params;
    let {attributeSelector = true} = options;

    attributeSelector = AttributeSelector.normalize(attributeSelector);

    const storable = this.getStorable(storableName, {includePrototypes: true});
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

    documents = documents.map(document =>
      AttributeSelector.pick(document, documentAttributeSelector, {
        includeAttributeNames: ['__component']
      })
    );

    const serializedStorables = documents.map(document => this.fromDocument(storable, document));

    return serializedStorables;
  }

  async count(params) {
    ow(
      params,
      'params',
      ow.object.exactShape({
        storableName: ow.string.nonEmpty,
        query: ow.optional.object
      })
    );

    const {storableName, query = {}} = params;

    const storable = this.getStorable(storableName, {includePrototypes: true});
    const collectionName = this._getCollectionNameFromStorable(storable);

    const documentExpressions = this.toDocumentExpressions(storable, query);

    const documentsCount = await this.countDocuments({
      collectionName,
      expressions: documentExpressions
    });

    return documentsCount;
  }

  // === Serialization ===

  toDocument(storable, serializedStorable) {
    return deserialize(serializedStorable);
  }

  // {a: 1, b: {c: 2}} => [['a', '$equal', 1], ['b.c', '$equal', 2]]
  toDocumentExpressions(storable, query) {
    const documentQuery = this.toDocument(storable, query);

    const build = function(query, expressions, path) {
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

        const subpath = path !== '' ? `${path}.${name}` : name;

        handleValue(value, expressions, subpath, {query});
      }
    };

    const handleValue = function(value, expressions, subpath, {query}) {
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

    // eslint-disable-next-line max-params
    const handleOperator = function(operator, value, expressions, path, {query}) {
      const normalizedOperator = normalizeOperatorForValue(operator, value, {query});

      if (
        normalizedOperator === '$some' ||
        normalizedOperator === '$every' ||
        normalizedOperator === '$not'
      ) {
        const subexpressions = [];
        handleValue(value, subexpressions, '', {query});
        expressions.push([path, normalizedOperator, subexpressions]);
        return;
      }

      if (
        normalizedOperator === '$and' ||
        normalizedOperator === '$or' ||
        normalizedOperator === '$nor'
      ) {
        const values = value;
        const operatorExpressions = values.map(value => {
          const subexpressions = [];
          handleValue(value, subexpressions, '', {query});
          return subexpressions;
        });
        expressions.push([path, normalizedOperator, operatorExpressions]);
        return;
      }

      expressions.push([path, normalizedOperator, value]);
    };

    const documentExpressions = [];
    build(documentQuery, documentExpressions, '');
    return documentExpressions;
  }

  fromDocument(storable, document) {
    return serialize(document);
  }

  // === Utilities ===

  static isStore(object) {
    return isStore(object);
  }
}

// {a: true, b: {c: true}} => {__component: 1, a: 1, "b.__component": 1, "b.c": 1}
function buildProjection(attributeSelector) {
  if (attributeSelector === true) {
    return undefined;
  }

  if (attributeSelector === false) {
    return {__component: true}; // Always include the '__component' attribute
  }

  const projection = {};

  const build = function(attributeSelector, path) {
    attributeSelector = {__component: true, ...attributeSelector};

    for (const [name, subattributeSelector] of AttributeSelector.iterate(attributeSelector)) {
      const subpath = (path !== '' ? path + '.' : '') + name;

      if (subattributeSelector === true) {
        projection[subpath] = 1;
      } else {
        build(subattributeSelector, subpath);
      }
    }
  };

  build(attributeSelector, '');

  return projection;
}

function buildDocumentPatch(document) {
  const documentPatch = {};

  const build = function(document, path) {
    if (document === undefined) {
      if (documentPatch.$unset === undefined) {
        documentPatch.$unset = {};
      }

      documentPatch.$unset[path] = 1;

      return;
    }

    if (isPlainObject(document) && '__component' in document) {
      for (const [name, value] of Object.entries(document)) {
        const subpath = (path !== '' ? path + '.' : '') + name;
        build(value, subpath);
      }

      return;
    }

    if (isPlainObject(document) || Array.isArray(document)) {
      deleteUndefinedProperties(document);
    }

    if (documentPatch.$set === undefined) {
      documentPatch.$set = {};
    }

    documentPatch.$set[path] = document;
  };

  build(document, '');

  return documentPatch;
}
