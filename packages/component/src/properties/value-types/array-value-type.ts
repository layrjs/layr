import isEmpty from 'lodash/isEmpty';

import {ValueType, ValueTypeOptions} from './value-type';
import type {ExpandAttributeSelectorOptions} from '../../component';
import type {Attribute} from '../attribute';
import type {AttributeSelector} from '../attribute-selector';
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

  _getAttributeSelector(_attribute: Attribute): AttributeSelector {
    throw new Error('Method not yet implemented'); // TODO
  }

  _expandAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    attribute: Attribute,
    options: ExpandAttributeSelectorOptions
  ) {
    return this.getItemType()._expandAttributeSelector(
      normalizedAttributeSelector,
      attribute,
      options
    );
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

  serializeValue(value: unknown, attribute: Attribute, options: SerializeOptions = {}) {
    return super.serializeValue(value, attribute, {...options, skipUnchangedAttributes: false});
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
