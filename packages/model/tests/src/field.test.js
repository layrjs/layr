import {Model, Field, isField} from '../../..';

describe('Field', () => {
  test.only('Creation', async () => {
    class Movie extends Model() {}

    const field = new Field('limit', Movie, {valueType: 'number'});

    expect(isField(field)).toBe(true);
    expect(field.getName()).toBe('limit');
    expect(field.getParent()).toBe(Movie);
  });

  test('Value', async () => {
    class Movie extends Model() {}

    const movie = new Movie();

    const field = new Field('title', movie);

    expect(field.isActive()).toBe(false);
    expect(() => field.getValue()).toThrow(
      "Cannot get the value from the 'title' field which is inactive"
    );
    expect(field.getValue({throwIfInactive: false})).toBeUndefined();

    field.setValue('Inception');

    expect(field.isActive()).toBe(true);
    expect(field.getValue()).toBe('Inception');
  });

  test('Accessors', async () => {
    class Movie extends Model() {}

    const movie = new Movie();

    const field = new Field('title', movie, {
      getter() {
        expect(this).toBe(movie);
        return this._title;
      },
      setter(title) {
        expect(this).toBe(movie);
        this._title = title.substr(0, 1).toUpperCase() + title.substr(1);
      }
    });

    expect(field.isActive()).toBe(true);
    expect(field.getValue()).toBeUndefined();

    field.setValue('inception');

    expect(field.getValue()).toBe('Inception');
  });

  test('Initial value', async () => {
    class Movie extends Model() {}

    let field = new Field('limit', Movie);

    expect(field.isActive()).toBe(false);

    field = new Field('limit', Movie, {value: 100});

    expect(field.isActive()).toBe(true);
    expect(field.getValue()).toBe(100);
  });

  test('Default value', async () => {
    class Movie extends Model() {}

    const movie = new Movie();

    const field = new Field('title', movie, {
      default() {
        expect(this).toBe(movie);
        return '';
      }
    });

    expect(field.getDefaultValue()).toBe('');

    const fieldWithoutDefault = new Field('duration', movie);

    expect(fieldWithoutDefault.getDefaultValue()).toBe(undefined);
  });

  test('Forking', async () => {
    class Movie extends Model() {}

    const movie = new Movie();

    const field = new Field('title', movie);
    field.setValue('Inception');

    expect(field.getValue()).toBe('Inception');

    const forkedMovie = Object.create(movie);
    const forkedField = field.fork(forkedMovie);

    expect(forkedField.getValue()).toBe('Inception');

    forkedField.setValue('Inception 2');

    expect(forkedField.getValue()).toBe('Inception 2');
    expect(field.getValue()).toBe('Inception');
  });

  test('Introspection', async () => {
    class Movie extends Model() {}

    expect(new Field('limit', Movie, {exposure: {get: true}}).introspect()).toStrictEqual({
      name: 'limit',
      type: 'field',
      exposure: {get: true}
    });

    expect(
      new Field('limit', Movie, {value: 100, exposure: {get: true}}).introspect()
    ).toStrictEqual({name: 'limit', type: 'field', value: 100, exposure: {get: true}});

    const defaultTitle = function() {
      return '';
    };
    expect(
      new Field('title', Movie.prototype, {
        default: defaultTitle,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'field',
      default: defaultTitle,
      exposure: {get: true}
    });
  });
});
