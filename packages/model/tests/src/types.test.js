import {
  Model,
  BooleanType,
  isBooleanType,
  NumberType,
  isNumberType,
  StringType,
  isStringType,
  ObjectType,
  isObjectType,
  DateType,
  isDateType,
  RegExpType,
  isRegExpType,
  ArrayType,
  isArrayType,
  ComponentType,
  isComponentType,
  createType,
  validators,
  requiredValidator
} from '../../..';

describe('Types', () => {
  class ModelAttribute {
    constructor(name, parent) {
      this._name = name;
      this._parent = parent;
    }

    getName() {
      return this._name;
    }

    getParent() {
      return this._parent;
    }

    describe() {
      return `attribute name: '${this.getName()}'`;
    }

    static isModelAttribute(object) {
      return object?.constructor?.isModelAttribute === 'function';
    }
  }

  ModelAttribute.humanName = 'Attribute';

  const modelAttribute = new ModelAttribute('modelAttribute');

  test('BooleanType', async () => {
    let type = new BooleanType({modelAttribute});

    expect(isBooleanType(type)).toBe(true);

    expect(type.toString()).toBe('boolean');

    expect(() => type.checkValue(true, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(false, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(1, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'boolean', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'boolean', received type: 'undefined')"
    );

    type = new BooleanType({isOptional: true, modelAttribute});

    expect(type.toString()).toBe('boolean?');

    expect(() => type.checkValue(true, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(false, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(1, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'boolean?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('NumberType', async () => {
    let type = new NumberType({modelAttribute});

    expect(isNumberType(type)).toBe(true);

    expect(type.toString()).toBe('number');

    expect(() => type.checkValue(1, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number', received type: 'undefined')"
    );

    type = new NumberType({isOptional: true, modelAttribute});

    expect(type.toString()).toBe('number?');

    expect(() => type.checkValue(1, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('StringType', async () => {
    let type = new StringType({modelAttribute});

    expect(isStringType(type)).toBe(true);

    expect(type.toString()).toBe('string');

    expect(() => type.checkValue('a', {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(1, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'string', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'string', received type: 'undefined')"
    );

    type = new StringType({isOptional: true, modelAttribute});

    expect(type.toString()).toBe('string?');

    expect(() => type.checkValue('a', {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(1, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'string?', received type: 'number')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('ObjectType', async () => {
    let type = new ObjectType({modelAttribute});

    expect(isObjectType(type)).toBe(true);

    class Movie extends Model {}

    const movie = new Movie();

    expect(type.toString()).toBe('object');

    expect(() => type.checkValue({}, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue({title: 'Inception'}, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'object', received type: 'string')"
    );
    expect(() => type.checkValue(movie, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'object', received type: 'movie')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'object', received type: 'undefined')"
    );

    type = new ObjectType({isOptional: true, modelAttribute});

    expect(type.toString()).toBe('object?');

    expect(() => type.checkValue({}, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue({title: 'Inception'}, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(movie, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'object?', received type: 'movie')"
    );
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'object?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('DateType', async () => {
    let type = new DateType({modelAttribute});

    expect(isDateType(type)).toBe(true);

    expect(type.toString()).toBe('date');

    expect(() => type.checkValue(new Date(), {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'date', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'date', received type: 'undefined')"
    );

    type = new DateType({isOptional: true, modelAttribute});

    expect(type.toString()).toBe('date?');

    expect(() => type.checkValue(new Date(), {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'date?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('RegExpType', async () => {
    let type = new RegExpType({modelAttribute});

    expect(isRegExpType(type)).toBe(true);

    expect(type.toString()).toBe('regExp');

    expect(() => type.checkValue(/abc/, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'regExp', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'regExp', received type: 'undefined')"
    );

    type = new RegExpType({isOptional: true, modelAttribute});

    expect(type.toString()).toBe('regExp?');

    expect(() => type.checkValue(/abc/, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue('a', {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'regExp?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('ArrayType', async () => {
    let itemType = new NumberType({modelAttribute});
    let type = new ArrayType({itemType, modelAttribute});

    expect(isArrayType(type)).toBe(true);

    expect(type.toString()).toBe('[number]');

    expect(() => type.checkValue([], {modelAttribute})).not.toThrow();
    expect(() => type.checkValue([1], {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(1, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: '[number]', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: '[number]', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined], {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([1, undefined], {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number', received type: 'undefined')"
    );
    expect(() => type.checkValue([undefined, 1], {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number', received type: 'undefined')"
    );

    itemType = new NumberType({isOptional: true, modelAttribute});
    type = new ArrayType({isOptional: true, itemType, modelAttribute});

    expect(type.toString()).toBe('[number?]?');

    expect(() => type.checkValue([], {modelAttribute})).not.toThrow();
    expect(() => type.checkValue([1], {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(1, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: '[number?]?', received type: 'number')"
    );
    expect(() => type.checkValue(['a'], {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'number?', received type: 'string')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue([undefined], {modelAttribute})).not.toThrow();
    expect(() => type.checkValue([1, undefined], {modelAttribute})).not.toThrow();
    expect(() => type.checkValue([undefined, 1], {modelAttribute})).not.toThrow();
  });

  test('ComponentType', async () => {
    class Movie extends Model {}

    class Actor extends Model {}

    class Registry extends Model {}

    Registry.registerRelatedComponent(Movie);
    Registry.registerRelatedComponent(Actor);

    const modelAttribute = new ModelAttribute('modelAttribute', Registry);

    const movie = new Movie();
    const actor = new Actor();

    // Component class types

    let type = new ComponentType({componentName: 'Movie', modelAttribute});

    expect(isComponentType(type)).toBe(true);

    expect(type.toString()).toBe('Movie');

    expect(() => type.checkValue(Movie, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(Actor, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie', received type: 'Actor')"
    );
    expect(() => type.checkValue(movie, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie', received type: 'movie')"
    );
    expect(() => type.checkValue({}, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie', received type: 'undefined')"
    );

    type = new ComponentType({componentName: 'Movie', isOptional: true, modelAttribute});

    expect(type.toString()).toBe('Movie?');

    expect(() => type.checkValue(Movie, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(Actor, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie?', received type: 'Actor')"
    );
    expect(() => type.checkValue(movie, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie?', received type: 'movie')"
    );
    expect(() => type.checkValue({}, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'Movie?', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();

    // Component instance types

    type = new ComponentType({componentName: 'movie', modelAttribute});

    expect(isComponentType(type)).toBe(true);

    expect(type.toString()).toBe('movie');

    expect(() => type.checkValue(movie, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(actor, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie', received type: 'actor')"
    );
    expect(() => type.checkValue(Movie, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie', received type: 'Movie')"
    );
    expect(() => type.checkValue({}, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie', received type: 'undefined')"
    );

    type = new ComponentType({componentName: 'movie', isOptional: true, modelAttribute});

    expect(type.toString()).toBe('movie?');

    expect(() => type.checkValue(movie, {modelAttribute})).not.toThrow();
    expect(() => type.checkValue(actor, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie?', received type: 'actor')"
    );
    expect(() => type.checkValue(Movie, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie?', received type: 'Movie')"
    );
    expect(() => type.checkValue({}, {modelAttribute})).toThrow(
      "Cannot assign a value of an unexpected type (attribute name: 'modelAttribute', expected type: 'movie?', received type: 'object')"
    );
    expect(() => type.checkValue(undefined, {modelAttribute})).not.toThrow();
  });

  test('createType()', async () => {
    let type = createType('string', {modelAttribute});

    expect(isStringType(type)).toBe(true);
    expect(type.isOptional()).toBe(false);

    type = createType('string?', {modelAttribute});

    expect(isStringType(type)).toBe(true);
    expect(type.isOptional()).toBe(true);

    type = createType('[number]', {modelAttribute});

    expect(isArrayType(type)).toBe(true);
    expect(type.isOptional()).toBe(false);
    expect(isNumberType(type.getItemType())).toBe(true);
    expect(type.getItemType().isOptional()).toBe(false);

    type = createType('[number?]?', {modelAttribute});

    expect(isArrayType(type)).toBe(true);
    expect(type.isOptional()).toBe(true);
    expect(isNumberType(type.getItemType())).toBe(true);
    expect(type.getItemType().isOptional()).toBe(true);

    type = createType('string', {modelAttribute});

    expect(type.getValidators()).toEqual([]);

    const notEmpty = validators.notEmpty();
    type = createType('string', {validators: [notEmpty], modelAttribute});

    expect(type.getValidators()).toEqual([notEmpty]);

    const integer = validators.integer();
    type = createType('[number]', {
      validators: [notEmpty],
      items: {validators: [integer]},
      modelAttribute
    });

    expect(type.getValidators()).toEqual([notEmpty]);
    expect(type.getItemType().getValidators()).toEqual([integer]);

    type = createType('[[number]]', {items: {items: {validators: [integer]}}, modelAttribute});

    expect(
      type
        .getItemType()
        .getItemType()
        .getValidators()
    ).toEqual([integer]);
  });

  test('Validation', async () => {
    const notEmpty = validators.notEmpty();

    let type = createType('string', {modelAttribute});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);

    type = createType('string?', {modelAttribute});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators(undefined)).toEqual([]);

    type = createType('string', {modelAttribute, validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);

    type = createType('string?', {modelAttribute, validators: [notEmpty]});

    expect(type.runValidators('Inception')).toEqual([]);
    expect(type.runValidators('')).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(undefined)).toEqual([]);

    type = createType('[string]', {
      modelAttribute,
      validators: [notEmpty],
      items: {validators: [notEmpty]}
    });

    expect(type.runValidators(['Inception'])).toEqual([]);
    expect(type.runValidators([])).toEqual([{validator: notEmpty, path: ''}]);
    expect(type.runValidators(['Inception', ''])).toEqual([{validator: notEmpty, path: '[1]'}]);
    expect(type.runValidators(undefined)).toEqual([{validator: requiredValidator, path: ''}]);
    expect(type.runValidators(['Inception', undefined])).toEqual([
      {validator: requiredValidator, path: '[1]'}
    ]);

    type = createType('[[string]]', {modelAttribute, items: {items: {validators: [notEmpty]}}});

    expect(type.runValidators([['Inception', '']])).toEqual([
      {validator: notEmpty, path: '[0][1]'}
    ]);
  });
});
