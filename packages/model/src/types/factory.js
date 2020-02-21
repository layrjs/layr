import ow from 'ow';

import {NumberType} from './number-type';
import {StringType} from './string-type';
import {ArrayType} from './array-type';
import {ComponentType} from './component-type';

const TYPE_MAP = new Map(
  Object.entries({
    number: NumberType,
    string: StringType
  })
);

export function createType(specifier, options = {}) {
  ow(specifier, 'specifier', ow.string.nonEmpty);
  ow(options, 'options', ow.object.exactShape({validators: ow.optional.array, field: ow.object}));

  const {validators = [], field} = options;

  let isOptional;

  if (specifier.endsWith('?')) {
    isOptional = true;
    specifier = specifier.slice(0, -1);
  }

  if (specifier.startsWith('[') && specifier.endsWith(']')) {
    return createArrayType(specifier, {isOptional, validators, field});
  }

  const typeName = specifier;

  const Type = TYPE_MAP.get(typeName);

  if (Type !== undefined) {
    return new Type({isOptional, validators, field});
  }

  const componentName = typeName;

  return new ComponentType({componentName, isOptional, validators, field});
}

function createArrayType(specifier, {isOptional, validators, field}) {
  const elementSpecifier = specifier.slice(1, -1);

  let elementValidators;

  const elementValidatorsIndex = validators.findIndex(validator => Array.isArray(validator));

  if (elementValidatorsIndex !== -1) {
    elementValidators = validators[elementValidatorsIndex];
    validators = [
      ...validators.slice(0, elementValidatorsIndex),
      ...validators.slice(elementValidatorsIndex + 1)
    ];
  } else {
    elementValidators = [];
  }

  const elementType = createType(elementSpecifier, {validators: elementValidators, field});

  return new ArrayType({elementType, isOptional, validators, field});
}
