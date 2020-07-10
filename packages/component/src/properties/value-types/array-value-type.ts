import {possiblyAsync} from 'possibly-async';
import isEmpty from 'lodash/isEmpty';

import {ValueType, ValueTypeOptions} from './value-type';
import type {
  TraverseAttributesIteratee,
  TraverseAttributesOptions,
  ExpandAttributeSelectorOptions
} from '../../component';
import type {Attribute} from '../attribute';
import {
  AttributeSelector,
  mergeAttributeSelectors,
  intersectAttributeSelectors
} from '../attribute-selector';
import {SerializeOptions} from '../../serialization';
import {joinAttributePath} from '../../utilities';

export class ArrayValueType extends ValueType {
  _itemType: ValueType;

  constructor(itemType: ValueType, attribute: Attribute, options: ValueTypeOptions = {}) {
    super(attribute, options);

    this._itemType = itemType;
  }

  getItemType() {
    return this._itemType;
  }

  toString() {
    return `${this.getItemType().toString()}[]${super.toString()}`;
  }

  checkValue(values: unknown[], attribute: Attribute) {
    super.checkValue(values, attribute);

    if (values === undefined) {
      // `values` is undefined and isOptional() is true
      return;
    }

    const itemType = this.getItemType();

    for (const value of values) {
      itemType.checkValue(value, attribute);
    }
  }

  _checkValue(values: unknown, attribute: Attribute) {
    return super._checkValue(values, attribute) ?? Array.isArray(values);
  }

  _traverseAttributes(
    iteratee: TraverseAttributesIteratee,
    attribute: Attribute,
    items: unknown,
    options: TraverseAttributesOptions
  ) {
    const {setAttributesOnly} = options;

    const itemType = this.getItemType();

    if (!setAttributesOnly) {
      itemType._traverseAttributes(iteratee, attribute, undefined, options);
      return;
    }

    if (Array.isArray(items)) {
      for (const item of items) {
        itemType._traverseAttributes(iteratee, attribute, item, options);
      }
    }
  }

  _expandAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    attribute: Attribute,
    items: unknown,
    options: ExpandAttributeSelectorOptions
  ): AttributeSelector {
    const {setAttributesOnly, aggregationMode} = options;

    options = {...options, _skipUnchangedAttributes: false, _isArrayItem: true};

    if (normalizedAttributeSelector === false) {
      return false;
    }

    const itemType = this.getItemType();

    if (!setAttributesOnly || !Array.isArray(items) || items.length === 0) {
      return itemType._expandAttributeSelector(
        normalizedAttributeSelector,
        attribute,
        undefined,
        options
      );
    }

    let expandedAttributeSelector: AttributeSelector | undefined = undefined;

    const aggregate =
      aggregationMode === 'union' ? mergeAttributeSelectors : intersectAttributeSelectors;

    for (const item of items) {
      const itemAttributeSelector = itemType._expandAttributeSelector(
        normalizedAttributeSelector,
        attribute,
        item,
        options
      );

      if (expandedAttributeSelector === undefined) {
        expandedAttributeSelector = itemAttributeSelector;
      } else {
        expandedAttributeSelector = aggregate(expandedAttributeSelector, itemAttributeSelector);
      }
    }

    return expandedAttributeSelector!;
  }

  runValidators(values: unknown[] | undefined, attributeSelector?: AttributeSelector) {
    const failedValidators = super.runValidators(values, attributeSelector);

    if (values !== undefined) {
      const itemType = this.getItemType();

      values.forEach((value, index) => {
        const failedItemValidators = itemType.runValidators(value, attributeSelector);

        for (const {validator, path} of failedItemValidators) {
          failedValidators.push({validator, path: joinAttributePath([`[${index}]`, path])});
        }
      });
    }

    return failedValidators;
  }

  serializeValue(items: unknown, attribute: Attribute, options: SerializeOptions = {}) {
    if (Array.isArray(items)) {
      const itemType = this.getItemType();

      return possiblyAsync.map(items, (item) => itemType.serializeValue(item, attribute, options));
    }

    return super.serializeValue(items, attribute, options);
  }

  introspect() {
    const introspectedArrayType = super.introspect();

    const introspectedItemType = this.getItemType().introspect();
    delete introspectedItemType.valueType;

    if (!isEmpty(introspectedItemType)) {
      introspectedArrayType.items = introspectedItemType;
    }

    return introspectedArrayType;
  }

  static isArrayValueType(value: any): value is ArrayValueType {
    return isArrayValueTypeInstance(value);
  }
}

export function isArrayValueTypeInstance(value: any): value is ArrayValueType {
  return typeof value?.constructor?.isArrayValueType === 'function';
}
