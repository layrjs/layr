import omit from 'lodash/omit';
import cloneDeep from 'lodash/cloneDeep';
import isPlainObject from 'lodash/isPlainObject';
import ow from 'ow';

import {getTypeOf} from './utilities';

export const AttributeSelector = {
  fromNames(names) {
    ow(names, 'names', ow.array);

    const attributeSelector = {};

    for (const name of names) {
      attributeSelector[name] = true;
    }

    return attributeSelector;
  },

  get(attributeSelector, name) {
    ow(name, 'name', ow.string.nonEmpty);

    attributeSelector = this.normalize(attributeSelector);

    if (typeof attributeSelector === 'boolean') {
      return attributeSelector;
    }

    return this.normalize(attributeSelector[name]);
  },

  set(attributeSelector, name, subattributeSelector) {
    ow(name, 'name', ow.string.nonEmpty);

    attributeSelector = this.normalize(attributeSelector);

    if (typeof attributeSelector === 'boolean') {
      return attributeSelector;
    }

    subattributeSelector = this.normalize(subattributeSelector);

    if (subattributeSelector === false) {
      return omit(attributeSelector, name);
    }

    return {...attributeSelector, [name]: subattributeSelector};
  },

  clone(attributeSelector) {
    return cloneDeep(attributeSelector);
  },

  isEqual(attributeSelector, otherAttributeSelector) {
    return (
      attributeSelector === otherAttributeSelector ||
      (this.includes(attributeSelector, otherAttributeSelector) &&
        this.includes(otherAttributeSelector, attributeSelector))
    );
  },

  includes(attributeSelector, otherAttributeSelector) {
    attributeSelector = this.normalize(attributeSelector);
    otherAttributeSelector = this.normalize(otherAttributeSelector);

    if (attributeSelector === otherAttributeSelector) {
      return true;
    }

    if (typeof attributeSelector === 'boolean') {
      return attributeSelector;
    }

    if (typeof otherAttributeSelector === 'boolean') {
      return !otherAttributeSelector;
    }

    for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
      const subattributeSelector = attributeSelector[name];

      if (!this.includes(subattributeSelector, otherSubattributeSelector)) {
        return false;
      }
    }

    return true;
  },

  add(attributeSelector, otherAttributeSelector) {
    attributeSelector = this.normalize(attributeSelector);
    otherAttributeSelector = this.normalize(otherAttributeSelector);

    if (attributeSelector === true) {
      return true;
    }

    if (attributeSelector === false) {
      return otherAttributeSelector;
    }

    if (otherAttributeSelector === true) {
      return true;
    }

    if (otherAttributeSelector === false) {
      return attributeSelector;
    }

    for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
      const subattributeSelector = attributeSelector[name];

      attributeSelector = this.set(
        attributeSelector,
        name,
        this.add(subattributeSelector, otherSubattributeSelector)
      );
    }

    return attributeSelector;
  },

  remove(attributeSelector, otherAttributeSelector) {
    attributeSelector = this.normalize(attributeSelector);
    otherAttributeSelector = this.normalize(otherAttributeSelector);

    if (otherAttributeSelector === true) {
      return false;
    }

    if (otherAttributeSelector === false) {
      return attributeSelector;
    }

    if (attributeSelector === true) {
      throw new Error(
        "Cannot remove an 'object' attribute selector from a 'true' attribute selector"
      );
    }

    if (attributeSelector === false) {
      return false;
    }

    for (const [name, otherSubattributeSelector] of Object.entries(otherAttributeSelector)) {
      const subattributeSelector = attributeSelector[name];

      attributeSelector = this.set(
        attributeSelector,
        name,
        this.remove(subattributeSelector, otherSubattributeSelector)
      );
    }

    return attributeSelector;
  },

  normalize(attributeSelector) {
    if (attributeSelector === undefined) {
      return false;
    }

    if (typeof attributeSelector === 'boolean') {
      return attributeSelector;
    }

    if (isPlainObject(attributeSelector)) {
      return attributeSelector;
    }

    throw new Error(
      `Expected a valid attribute selector, but received a value of type '${getTypeOf(
        attributeSelector
      )}'`
    );
  }
};
