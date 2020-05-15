import type {Attribute, AttributeOptions} from '../attribute';
import type {ValueType, IntrospectedValueType} from './value-type';
import {AnyValueType} from './any-value-type';
import {BooleanValueType} from './boolean-value-type';
import {NumberValueType} from './number-value-type';
import {StringValueType} from './string-value-type';
import {ObjectValueType} from './object-value-type';
import {DateValueType} from './date-value-type';
import {RegExpValueType} from './regexp-value-type';
import {ArrayValueType} from './array-value-type';
import {ComponentValueType} from './component-value-type';
import {Validator, ValidatorFunction} from '../validation';
import {isComponentType} from '../utilities';

const VALUE_TYPE_MAP = new Map(
  Object.entries({
    any: AnyValueType,
    boolean: BooleanValueType,
    number: NumberValueType,
    string: StringValueType,
    object: ObjectValueType,
    Date: DateValueType,
    RegExp: RegExpValueType
  })
);

type CreateValueTypeOptions = {
  validators?: (Validator | ValidatorFunction)[];
  items?: CreateValueTypeOptions;
};

export function createValueType(
  specifier: string | undefined,
  attribute: Attribute,
  options: CreateValueTypeOptions = {}
): ValueType {
  const {validators = [], items} = options;

  let type = specifier ? specifier : 'any';
  let isOptional: boolean;

  if (type.endsWith('?')) {
    isOptional = true;
    type = type.slice(0, -1);

    if (type === '') {
      type = 'any';
    }
  } else {
    isOptional = false;
  }

  if (type.endsWith('[]')) {
    const itemSpecifier = type.slice(0, -2);
    const itemType = createValueType(itemSpecifier, attribute, {...items});
    return new ArrayValueType(itemType, attribute, {isOptional, validators});
  }

  if (items !== undefined) {
    throw new Error(
      `The 'items' option cannot be specified for a type that is not an array (${attribute.describe()}, type: '${specifier}')`
    );
  }

  const ValueTypeClass = VALUE_TYPE_MAP.get(type);

  if (ValueTypeClass !== undefined) {
    return new ValueTypeClass(attribute, {isOptional, validators});
  }

  if (!isComponentType(type)) {
    throw new Error(
      `The specified type is invalid (${attribute.describe()}, type: '${specifier}')`
    );
  }

  return new ComponentValueType(type, attribute, {isOptional, validators});
}

export function unintrospectValueType({
  valueType,
  validators: introspectedValidators,
  items: introspectedItems
}: IntrospectedValueType) {
  let unintrospectedValidators: Validator[] | undefined;
  let unintrospectedItems: Partial<AttributeOptions> | undefined;

  if (introspectedValidators !== undefined) {
    unintrospectedValidators = introspectedValidators.map((introspectedValidator) => {
      const {name, function: func, arguments: args, message} = Validator.unintrospect(
        introspectedValidator
      );
      return new Validator(func, {name, arguments: args, message});
    });
  }

  if (introspectedItems !== undefined) {
    unintrospectedItems = unintrospectValueType(introspectedItems);
  }

  const unintrospectedValueType: Partial<AttributeOptions> = {};

  if (valueType !== undefined) {
    unintrospectedValueType.valueType = valueType;
  }

  if (unintrospectedValidators !== undefined) {
    unintrospectedValueType.validators = unintrospectedValidators;
  }

  if (unintrospectedItems !== undefined) {
    unintrospectedValueType.items = unintrospectedItems;
  }

  return unintrospectedValueType;
}
