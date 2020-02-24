import ow from 'ow';

import {BooleanType} from './boolean-type';
import {NumberType} from './number-type';
import {StringType} from './string-type';
import {ObjectType} from './object-type';
import {DateType} from './date-type';
import {RegExpType} from './regexp-type';
import {ArrayType} from './array-type';
import {ComponentType} from './component-type';

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
      field: ow.object
    })
  );

  const {validators = [], items, field} = options;

  let isOptional;

  if (specifier.endsWith('?')) {
    isOptional = true;
    specifier = specifier.slice(0, -1);
  }

  if (specifier.startsWith('[') && specifier.endsWith(']')) {
    const itemSpecifier = specifier.slice(1, -1);
    const itemType = createType(itemSpecifier, {...items, field});
    return new ArrayType({itemType, isOptional, validators, field});
  }

  if (items !== undefined) {
    throw new Error(
      `The 'items' option cannot be specified for a type that is not an array (type: '${specifier}')`
    );
  }

  const typeName = specifier;

  const Type = TYPE_MAP.get(typeName);

  if (Type !== undefined) {
    return new Type({isOptional, validators, field});
  }

  const componentName = typeName;

  return new ComponentType({componentName, isOptional, validators, field});
}
