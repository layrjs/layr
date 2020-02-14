import {Component, Property, isProperty} from '../../..';

describe('Property', () => {
  test('Creation', async () => {
    class Movie extends Component() {}

    expect(() => new Property()).toThrow(
      'Expected `name` to be of type `string` but received type `undefined`'
    );

    expect(() => new Property('title')).toThrow(
      'Expected `parent` to be of type `object` but received type `undefined`'
    );

    expect(() => new Property('title', Movie, {unknownOption: 123})).toThrow(
      'Did not expect property `unknownOption` to exist, got `123` in object `options`'
    );

    let property = new Property('title', Movie.prototype);

    expect(isProperty(property)).toBe(true);
    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);
    expect(property.getExposure()).toBeUndefined();

    property = new Property('find', Movie, {exposure: {call: true}});

    expect(isProperty(property)).toBe(true);
    expect(property.getName()).toBe('find');
    expect(property.getParent()).toBe(Movie);
    expect(property.getExposure()).toEqual({call: true});
  });

  test('Forking', async () => {
    class Movie {}

    const property = new Property('title', Movie.prototype);

    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);

    const movie = Object.create(Movie.prototype);
    const forkedProperty = property.fork(movie);

    expect(forkedProperty.getName()).toBe('title');
    expect(forkedProperty.getParent()).toBe(movie);
  });
});
