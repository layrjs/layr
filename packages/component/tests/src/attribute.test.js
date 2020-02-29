import {Component, Attribute, isAttribute} from '../../..';

describe('Attribute', () => {
  test('Creation', async () => {
    class Movie extends Component() {}

    const attribute = new Attribute('limit', Movie);

    expect(isAttribute(attribute)).toBe(true);
    expect(attribute.getName()).toBe('limit');
    expect(attribute.getParent()).toBe(Movie);
  });

  test('Value', async () => {
    class Movie extends Component() {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie);

    expect(attribute.isSet()).toBe(false);
    expect(() => attribute.getValue()).toThrow(
      "Cannot get the value of an unset attribute (attribute name: 'title')"
    );
    expect(attribute.getValue({throwIfUnset: false})).toBeUndefined();

    attribute.setValue('Inception');

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBe('Inception');

    attribute.unsetValue();

    expect(attribute.isSet()).toBe(false);
  });

  test('Accessors', async () => {
    class Movie extends Component() {}

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

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBeUndefined();

    attribute.setValue('inception');

    expect(attribute.getValue()).toBe('Inception');
  });

  test('Initial value', async () => {
    class Movie extends Component() {}

    let attribute = new Attribute('limit', Movie);

    expect(attribute.isSet()).toBe(false);

    attribute = new Attribute('limit', Movie, {value: 100});

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBe(100);
  });

  test('Default value', async () => {
    class Movie extends Component() {}

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
    class Movie extends Component() {}

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

  test('Introspection', async () => {
    class Movie extends Component() {}

    expect(new Attribute('limit', Movie, {exposure: {get: true}}).introspect()).toStrictEqual({
      name: 'limit',
      type: 'attribute',
      exposure: {get: true}
    });

    expect(
      new Attribute('limit', Movie, {value: 100, exposure: {get: true}}).introspect()
    ).toStrictEqual({name: 'limit', type: 'attribute', value: 100, exposure: {get: true}});

    const defaultTitle = function() {
      return '';
    };
    expect(
      new Attribute('title', Movie.prototype, {
        default: defaultTitle,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'attribute',
      default: defaultTitle,
      exposure: {get: true}
    });
  });
});
