import ow from 'ow';

import {BooleanType} from './boolean-type';
import {NumberType} from './number-type';
import {StringType} from './string-type';
import {ObjectType} from './object-type';
import {DateType} from './date-type';
import {RegExpType} from './regexp-type';
import {ArrayType} from './array-type';
import {ComponentType} from './component-type';
import {Validator} from '../validation';

const TYPE_MAP = new Map(
  Object.entries({
    boolean: BooleanType,
    number: NumberType,
    string: StringType,
    object: ObjectType,
    date: DateType,
    regExp: RegExpType
  })
);

export function createType(specifier, options = {}) {
  ow(specifier, 'specifier', ow.string.nonEmpty);
  ow(
    options,
    'options',
    ow.object.exactShape({
      validators: ow.optional.array,
      items: ow.optional.object,
      modelAttribute: ow.object
    })
  );

  const {validators = [], items, modelAttribute} = options;

  let isOptional;

  if (specifier.endsWith('?')) {
    isOptional = true;
    specifier = specifier.slice(0, -1);
  }

  if (specifier.startsWith('[') && specifier.endsWith(']')) {
    const itemSpecifier = specifier.slice(1, -1);
    const itemType = createType(itemSpecifier, {...items, modelAttribute});
    return new ArrayType({itemType, isOptional, validators, modelAttribute});
  }

  if (items !== undefined) {
    throw new Error(
      `The 'items' option cannot be specified for a type that is not an array (type: '${specifier}')`
    );
  }

  const typeName = specifier;

  const Type = TYPE_MAP.get(typeName);

  if (Type !== undefined) {
    return new Type({isOptional, validators, modelAttribute});
  }

  const componentName = typeName;

  return new ComponentType({componentName, isOptional, validators, modelAttribute});
}

export function unintrospectType({
  valueType,
  validators: introspectedValidators,
  items: introspectedItems
}) {
  let unintrospectedValidators;
  let unintrospectedItems;

  if (introspectedValidators !== undefined) {
    unintrospectedValidators = introspectedValidators.map(introspectedValidator => {
      const {name, function: func, arguments: args, message} = Validator.unintrospect(
        introspectedValidator
      );
      return new Validator(func, {name, arguments: args, message});
    });
  }

  if (introspectedItems !== undefined) {
    unintrospectedItems = unintrospectType(introspectedItems);
  }

  return {type: valueType, validators: unintrospectedValidators, items: unintrospectedItems};
}
