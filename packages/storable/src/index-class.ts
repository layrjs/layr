import {isAttributeInstance, isIdentifierAttributeInstance} from '@layr/component';
import {assertIsPlainObject, assertNoUnknownOptions} from 'core-helpers';

import type {StorableComponent, SortDirection} from './storable';
import {isStorableAttributeInstance} from './properties/storable-attribute';
import {assertIsStorableInstance} from './utilities';

export type IndexAttributes = {[name: string]: SortDirection};

export type IndexOptions = {isUnique?: boolean};

export class Index {
  _attributes: IndexAttributes;
  _parent: StorableComponent;
  _options!: IndexOptions;

  constructor(attributes: IndexAttributes, parent: StorableComponent, options: IndexOptions = {}) {
    assertIsPlainObject(attributes);
    assertIsStorableInstance(parent);

    for (const [name, direction] of Object.entries(attributes)) {
      if (!parent.hasProperty(name)) {
        throw new Error(
          `Cannot create an index for an attribute that doesn't exist (${parent.describeComponent()}, attribute: '${name}')`
        );
      }

      const property = parent.getProperty(name, {autoFork: false});

      if (!isAttributeInstance(property)) {
        throw new Error(
          `Cannot create an index for a property that is not an attribute (${parent.describeComponent()}, property: '${name}')`
        );
      }

      if (isStorableAttributeInstance(property) && property.isComputed()) {
        throw new Error(
          `Cannot create an index for a computed attribute (${parent.describeComponent()}, attribute: '${name}')`
        );
      }

      if (!(direction === 'asc' || direction === 'desc')) {
        throw new Error(
          `Cannot create an index with an invalid sort direction (${parent.describeComponent()}, attribute: '${name}', sort direction: '${direction}')`
        );
      }
    }

    if (Object.keys(attributes).length === 0) {
      throw new Error(
        `Cannot create an index for an empty 'attributes' parameter (${parent.describeComponent()})`
      );
    }

    if (Object.keys(attributes).length === 1) {
      const name = Object.keys(attributes)[0];
      const attribute = parent.getAttribute(name, {autoFork: false});

      if (isIdentifierAttributeInstance(attribute)) {
        throw new Error(
          `Cannot create an index for an identifier attribute because this type of attribute is automatically indexed (${parent.describeComponent()}, attribute: '${name}')`
        );
      }
    }

    this._attributes = attributes;
    this._parent = parent;

    this.setOptions(options);
  }

  getAttributes() {
    return this._attributes;
  }

  getParent() {
    return this._parent;
  }

  // === Options ===

  getOptions() {
    return this._options;
  }

  setOptions(options: IndexOptions = {}) {
    const {isUnique, ...unknownOptions} = options;

    assertNoUnknownOptions(unknownOptions);

    this._options = {isUnique};
  }

  // === Forking ===

  fork(parent: StorableComponent) {
    const forkedIndex = Object.create(this) as Index;

    forkedIndex._parent = parent;

    return forkedIndex;
  }

  // === Utilities ===

  static isIndex(value: any): value is Index {
    return isIndexInstance(value);
  }

  static _buildIndexKey(attributes: IndexAttributes) {
    return JSON.stringify(attributes);
  }
}

export function isIndexClass(value: any): value is typeof Index {
  return typeof value?.isIndex === 'function';
}

export function isIndexInstance(value: any): value is Index {
  return isIndexClass(value?.constructor) === true;
}
