import {hasOwnProperty, PlainObject} from 'core-helpers';

import type {Component} from './component';

type IdentifierValue = string | number;

export class IdentityMap {
  _parent: typeof Component;

  constructor(parent: typeof Component) {
    this._parent = parent;
  }

  getParent() {
    return this._parent;
  }

  fork(newParent: typeof Component) {
    const forkedIdentityMap = Object.create(this) as IdentityMap;
    forkedIdentityMap._parent = newParent;
    return forkedIdentityMap;
  }

  // === Entities ===

  getComponent(identifiers: PlainObject = {}) {
    const parent = this.getParent();

    if (parent.isDetached()) {
      return undefined;
    }

    for (const identifierAttribute of parent.prototype.getIdentifierAttributes()) {
      const name = identifierAttribute.getName();
      const value: IdentifierValue | undefined = identifiers[name];

      if (value === undefined) {
        continue;
      }

      const index = this._getIndex(name);

      let component = index[value];

      if (component === undefined) {
        continue;
      }

      if (!hasOwnProperty(index, value)) {
        // The component's class has been forked
        component = component.fork({componentClass: parent});
      }

      return component;
    }

    return undefined;
  }

  addComponent(component: Component) {
    if (component.isDetached()) {
      throw new Error(
        `Cannot add a detached component to the identity map (${component.describeComponent()})`
      );
    }

    for (const identifierAttribute of component.getIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue() as IdentifierValue;
      const index = this._getIndex(name);

      if (hasOwnProperty(index, value)) {
        throw new Error(
          `A component with the same identifier already exists (${index[value]
            .getAttribute(name)
            .describe()})`
        );
      }

      index[value] = component;
    }
  }

  updateComponent(
    component: Component,
    attributeName: string,
    {
      previousValue,
      newValue
    }: {previousValue: IdentifierValue | undefined; newValue: IdentifierValue | undefined}
  ) {
    if (component.isDetached()) {
      return;
    }

    if (newValue === previousValue) {
      return;
    }

    const index = this._getIndex(attributeName);

    if (previousValue !== undefined) {
      delete index[previousValue];
    }

    if (newValue !== undefined) {
      if (hasOwnProperty(index, newValue)) {
        throw new Error(
          `A component with the same identifier already exists (${component
            .getAttribute(attributeName)
            .describe()})`
        );
      }

      index[newValue] = component;
    }
  }

  removeComponent(component: Component) {
    if (component.isDetached()) {
      throw new Error(
        `Cannot remove a detached component from the identity map (${component.describeComponent()})`
      );
    }

    for (const identifierAttribute of component.getIdentifierAttributes({
      setAttributesOnly: true
    })) {
      const name = identifierAttribute.getName();
      const value = identifierAttribute.getValue() as IdentifierValue;
      const index = this._getIndex(name);
      delete index[value];
    }
  }

  // === Indexes ===

  _getIndex(name: string) {
    const indexes = this._getIndexes();

    if (!indexes[name]) {
      indexes[name] = Object.create(null);
    } else if (!hasOwnProperty(indexes, name)) {
      indexes[name] = Object.create(indexes[name]);
    }

    return indexes[name];
  }

  _indexes!: {[name: string]: {[value: string]: Component}};

  _getIndexes() {
    if (!this._indexes) {
      this._indexes = Object.create(null);
    } else if (!hasOwnProperty(this, '_indexes')) {
      this._indexes = Object.create(this._indexes);
    }

    return this._indexes;
  }
}
