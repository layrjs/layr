import {
  validateComponentName,
  getComponentClassNameFromComponentInstanceName,
  AttributeSelector,
  getTypeOf
} from '@liaison/component';
import {getClassOf} from 'core-helpers';
import upperFirst from 'lodash/upperFirst';
import ow from 'ow';

import {isStore} from './utilities';

export class AbstractStore {
  constructor(storables) {
    ow(storables, 'storables', ow.optional.array);

    this._storables = Object.create(null);

    if (storables !== undefined) {
      for (const Storable of storables) {
        this.registerStorable(Storable);
      }
    }
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

    let serializedStorable = await this._loadFromCollection({
      collectionName,
      identifierDescriptor,
      attributeSelector
    });

    if (serializedStorable === undefined) {
      if (throwIfMissing) {
        throw new Error(
          `Cannot load a document that is missing from the store (collection: '${collectionName}', ${getClassOf(
            storable
          ).describeIdentifierDescriptor(identifierDescriptor)})`
        );
      }

      return undefined;
    }

    serializedStorable = AttributeSelector.pick(serializedStorable, attributeSelector, {
      includeAttributeNames: ['__component']
    });

    return serializedStorable;
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

    let {storableName, identifierDescriptor, serializedStorable, isNew = false} = params;

    const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

    if (throwIfMissing === true && throwIfExists === true) {
      throw new Error(
        "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
      );
    }

    const storable = this.getStorable(storableName, {includePrototypes: true});

    const collectionName = this._getCollectionNameFromStorable(storable);

    serializedStorable = await this._saveToCollection({
      collectionName,
      identifierDescriptor,
      serializedStorable,
      isNew
    });

    if (serializedStorable === undefined) {
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

      return undefined;
    }

    return serializedStorable;
  }

  // === Utilities ===

  static isStore(object) {
    return isStore(object);
  }
}
