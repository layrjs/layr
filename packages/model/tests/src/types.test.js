import {StringType, NumberType, ArrayType, createType, validators} from '../../..';

describe('Types', () => {
  const field = {
    getName() {
      return 'field';
    }
  };

  test('StringType', async () => {
    let type = new StringType({field});

    expect(type.toString()).toBe('string');

    expect(() => type.checkValue('a', {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'string', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'string', received type: 'undefined')"
    );

    type = new StringType({isOptional: true, field});

    expect(type.toString()).toBe('string?');

    expect(() => type.checkValue('a', {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'string?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('NumberType', async () => {
    let type = new NumberType({field});

    expect(type.toString()).toBe('number');

    expect(() => type.checkValue(1, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number', received type: 'undefined')"
    );

    type = new NumberType({isOptional: true, field});

    expect(type.toString()).toBe('number?');

    expect(() => type.checkValue(1, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('ArrayType', async () => {
    let elementType = new NumberType({field});
    let type = new ArrayType({elementType, field});

    expect(type.toString()).toBe('[number]');

    expect(() => type.checkValue([], {field})).not.toThrow();
    expect(() => type.checkValue([1], {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: '[number]', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: '[number]', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined], {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([1, undefined], {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined, 1], {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number', received type: 'undefined')"
    );

    elementType = new NumberType({isOptional: true, field});
    type = new ArrayType({isOptional: true, elementType, field});

    expect(type.toString()).toBe('[number?]?');

    expect(() => type.checkValue([], {field})).not.toThrow();
    expect(() => type.checkValue([1], {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: '[number?]?', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], {field})).toThrow(
      "Type mismatch (field name: 'field', expected type: 'number?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
    expect(() => type.checkValue([undefined], {field})).not.toThrow();
    expect(() => type.checkValue([1, undefined], {field})).not.toThrow();
    expect(() => type.checkValue([undefined, 1], {field})).not.toThrow();
  });

  test('createType()', async () => {
    let type = createType('string', {field});

    expect(type).toBeInstanceOf(StringType);
    expect(type.isOptional()).toBe(false);

    type = createType('string?', {field});

    expect(type).toBeInstanceOf(StringType);
    expect(type.isOptional()).toBe(true);

    type = createType('[number]', {field});

    expect(type).toBeInstanceOf(ArrayType);
    expect(type.isOptional()).toBe(false);
    expect(type.getElementType()).toBeInstanceOf(NumberType);
    expect(type.getElementType().isOptional()).toBe(false);

    type = createType('[number?]?', {field});

    expect(type).toBeInstanceOf(ArrayType);
    expect(type.isOptional()).toBe(true);
    expect(type.getElementType()).toBeInstanceOf(NumberType);
    expect(type.getElementType().isOptional()).toBe(true);

    type = createType('string', {field});

    expect(type.getValidators()).toEqual([]);

    const validator = validators.notEmpty();
    type = createType('string', {validators: [validator], field});

    expect(type.getValidators()).toEqual([validator]);

    const itemValidator = validators.integer();
    type = createType('[number]', {validators: [validator, [itemValidator]], field});

    expect(type.getValidators()).toEqual([validator]);
    expect(type.getElementType().getValidators()).toEqual([itemValidator]);
  });
});
