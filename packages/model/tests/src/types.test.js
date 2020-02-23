import {
  Model,
  BooleanType,
  NumberType,
  StringType,
  ArrayType,
  ComponentType,
  createType,
  validators
} from '../../..';

describe('Types', () => {
  const field = {
    getName() {
      return 'field';
    }
  };

  test('BooleanType', async () => {
    let type = new BooleanType({field});

    expect(type.toString()).toBe('boolean');

    expect(() => type.checkValue(true, {field})).not.toThrow();
    expect(() => type.checkValue(false, {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'boolean', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'boolean', received type: 'undefined')"
    );

    type = new BooleanType({isOptional: true, field});

    expect(type.toString()).toBe('boolean?');

    expect(() => type.checkValue(true, {field})).not.toThrow();
    expect(() => type.checkValue(false, {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'boolean?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('StringType', async () => {
    let type = new StringType({field});

    expect(type.toString()).toBe('string');

    expect(() => type.checkValue('a', {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'string', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'string', received type: 'undefined')"
    );

    type = new StringType({isOptional: true, field});

    expect(type.toString()).toBe('string?');

    expect(() => type.checkValue('a', {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'string?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('NumberType', async () => {
    let type = new NumberType({field});

    expect(type.toString()).toBe('number');

    expect(() => type.checkValue(1, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number', received type: 'undefined')"
    );

    type = new NumberType({isOptional: true, field});

    expect(type.toString()).toBe('number?');

    expect(() => type.checkValue(1, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number?', received type: 'string')"
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
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: '[number]', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: '[number]', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined], {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([1, undefined], {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined, 1], {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number', received type: 'undefined')"
    );

    elementType = new NumberType({isOptional: true, field});
    type = new ArrayType({isOptional: true, elementType, field});

    expect(type.toString()).toBe('[number?]?');

    expect(() => type.checkValue([], {field})).not.toThrow();
    expect(() => type.checkValue([1], {field})).not.toThrow();
    expect(() => type.checkValue(1, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: '[number?]?', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'number?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
    expect(() => type.checkValue([undefined], {field})).not.toThrow();
    expect(() => type.checkValue([1, undefined], {field})).not.toThrow();
    expect(() => type.checkValue([undefined, 1], {field})).not.toThrow();
  });

  test('ComponentType', async () => {
    class Movie extends Model() {}

    class Actor extends Model() {}

    const movie = new Movie();
    const actor = new Actor();

    // Component class types

    let type = new ComponentType({componentName: 'Movie', field});

    expect(type.toString()).toBe('Movie');

    expect(() => type.checkValue(Movie, {field})).not.toThrow();
    expect(() => type.checkValue(Actor, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie', received type: 'Actor')"
    );
    expect(() => type.checkValue(movie, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie', received type: 'movie')"
    );
    expect(() => type.checkValue({}, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie', received type: 'undefined')"
    );

    type = new ComponentType({componentName: 'Movie', isOptional: true, field});

    expect(type.toString()).toBe('Movie?');

    expect(() => type.checkValue(Movie, {field})).not.toThrow();
    expect(() => type.checkValue(Actor, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie?', received type: 'Actor')"
    );
    expect(() => type.checkValue(movie, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie?', received type: 'movie')"
    );
    expect(() => type.checkValue({}, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'Movie?', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();

    // Component instance types

    type = new ComponentType({componentName: 'movie', field});

    expect(type.toString()).toBe('movie');

    expect(() => type.checkValue(movie, {field})).not.toThrow();
    expect(() => type.checkValue(actor, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie', received type: 'actor')"
    );
    expect(() => type.checkValue(Movie, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie', received type: 'Movie')"
    );
    expect(() => type.checkValue({}, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie', received type: 'undefined')"
    );

    type = new ComponentType({componentName: 'movie', isOptional: true, field});

    expect(type.toString()).toBe('movie?');

    expect(() => type.checkValue(movie, {field})).not.toThrow();
    expect(() => type.checkValue(actor, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie?', received type: 'actor')"
    );
    expect(() => type.checkValue(Movie, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie?', received type: 'Movie')"
    );
    expect(() => type.checkValue({}, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'movie?', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
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
