import {
  Model,
  BooleanType,
  NumberType,
  StringType,
  ObjectType,
  DateType,
  RegExpType,
  ArrayType,
  ComponentType,
  createType,
  validators,
  requiredValidator
} from '../../..';

describe('Types', () => {
  class Field {
    getName() {
      return 'field';
    }
  }

  const field = new Field();

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

  test('ObjectType', async () => {
    let type = new ObjectType({field});

    class Movie extends Model() {}

    const movie = new Movie();

    expect(type.toString()).toBe('object');

    expect(() => type.checkValue({}, {field})).not.toThrow();
    expect(() => type.checkValue({title: 'Inception'}, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'object', received type: 'string')"
    );
    expect(() => type.checkValue(movie, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'object', received type: 'movie')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'object', received type: 'undefined')"
    );

    type = new ObjectType({isOptional: true, field});

    expect(type.toString()).toBe('object?');

    expect(() => type.checkValue({}, {field})).not.toThrow();
    expect(() => type.checkValue({title: 'Inception'}, {field})).not.toThrow();
    expect(() => type.checkValue(movie, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'object?', received type: 'movie')"
    );
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'object?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('DateType', async () => {
    let type = new DateType({field});

    expect(type.toString()).toBe('date');

    expect(() => type.checkValue(new Date(), {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'date', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'date', received type: 'undefined')"
    );

    type = new DateType({isOptional: true, field});

    expect(type.toString()).toBe('date?');

    expect(() => type.checkValue(new Date(), {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'date?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('RegExpType', async () => {
    let type = new RegExpType({field});

    expect(type.toString()).toBe('regExp');

    expect(() => type.checkValue(/abc/, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'regExp', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'regExp', received type: 'undefined')"
    );

    type = new RegExpType({isOptional: true, field});

    expect(type.toString()).toBe('regExp?');

    expect(() => type.checkValue(/abc/, {field})).not.toThrow();
    expect(() => type.checkValue('a', {field})).toThrow(
      "Cannot assign a value of an unexpected type to the field 'field' (expected type: 'regExp?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {field})).not.toThrow();
  });

  test('ArrayType', async () => {
    let itemType = new NumberType({field});
    let type = new ArrayType({itemType, field});

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

    itemType = new NumberType({isOptional: true, field});
    type = new ArrayType({isOptional: true, itemType, field});

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
    expect(type.getItemType()).toBeInstanceOf(NumberType);
    expect(type.getItemType().isOptional()).toBe(false);

    type = createType('[number?]?', {field});

    expect(type).toBeInstanceOf(ArrayType);
    expect(type.isOptional()).toBe(true);
    expect(type.getItemType()).toBeInstanceOf(NumberType);
    expect(type.getItemType().isOptional()).toBe(true);

    type = createType('string', {field});

    expect(type.getValidators()).toEqual([]);

    const notEmpty = validators.notEmpty();
    type = createType('string', {validators: [notEmpty], field});

    expect(type.getValidators()).toEqual([notEmpty]);

    const integer = validators.integer();
    type = createType('[number]', {validators: [notEmpty], items: {validators: [integer]}, field});

    expect(type.getValidators()).toEqual([notEmpty]);
    expect(type.getItemType().getValidators()).toEqual([integer]);

    type = createType('[[number]]', {items: {items: {validators: [integer]}}, field});

    expect(
      type
        .getItemType()
        .getItemType()
        .getValidators()
    ).toEqual([integer]);
  });

  test('Validation', async () => {
    const notEmpty = validators.notEmpty();

    let type = createType('string', {field});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);

    type = createType('string?', {field});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators(undefined)).toEqual([]);

    type = createType('string', {field, validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);

    type = createType('string?', {field, validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([]);

    type = createType('[string]', {field, validators: [notEmpty], items: {validators: [notEmpty]}});

    expect(type.runValidators(['Inception'])).toEqual([]);
    expect(type.runValidators([])).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(['Inception', ''])).toEqual([{validator: notEmpty, path: '[1]'}]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);
    expect(type.runValidators(['Inception', undefined])).toEqual([
      {validator: requiredValidator, path: '[1]'}
    ]);

    type = createType('[[string]]', {field, items: {items: {validators: [notEmpty]}}});

    expect(type.runValidators([['Inception', '']])).toEqual([
      {validator: notEmpty, path: '[0][1]'}
    ]);
  });
});
