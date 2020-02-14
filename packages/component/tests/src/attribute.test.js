import {Attribute, isAttribute} from '../../..';

describe('Attribute', () => {
  test('Creation', async () => {
    class Movie {}

    const attribute = new Attribute('limit', Movie);

    expect(isAttribute(attribute)).toBe(true);
    expect(attribute.getName()).toBe('limit');
    expect(attribute.getParent()).toBe(Movie);
  });

  test('Value', async () => {
    class Movie {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie);

    expect(attribute.isActive()).toBe(false);
    expect(() => attribute.getValue()).toThrow(
      "Cannot get the value from the 'title' attribute which is inactive"
    );
    expect(attribute.getValue({throwIfInactive: false})).toBeUndefined();

    attribute.setValue('Inception');

    expect(attribute.isActive()).toBe(true);
    expect(attribute.getValue()).toBe('Inception');
  });

  test('Accessors', async () => {
    class Movie {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {
      getter() {
        expect(this).toBe(movie);
        return this._title;
      },
      setter(title) {
        expect(this).toBe(movie);
        this._title = title.substr(0, 1).toUpperCase() + title.substr(1);
      }
    });

    expect(attribute.isActive()).toBe(true);
    expect(attribute.getValue()).toBeUndefined();

    attribute.setValue('inception');

    expect(attribute.getValue()).toBe('Inception');
  });

  test('Default value', async () => {
    class Movie {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {
      default() {
        expect(this).toBe(movie);
        return '';
      }
    });

    expect(attribute.getDefaultValue()).toBe('');

    const attributeWithoutDefault = new Attribute('duration', movie);

    expect(attributeWithoutDefault.getDefaultValue()).toBe(undefined);
  });

  test('Forking', async () => {
    class Movie {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie);
    attribute.setValue('Inception');

    expect(attribute.getValue()).toBe('Inception');

    const forkedMovie = Object.create(movie);
    const forkedAttribute = attribute.fork(forkedMovie);

    expect(forkedAttribute.getValue()).toBe('Inception');

    forkedAttribute.setValue('Inception 2');

    expect(forkedAttribute.getValue()).toBe('Inception 2');
    expect(attribute.getValue()).toBe('Inception');
  });
});
