import {Property, isProperty} from '../../..';

describe('Property', () => {
  test('Creation', async () => {
    expect(() => new Property()).toThrow(
      'Expected `name` to be of type `string` but received type `undefined`'
    );

    expect(() => new Property('title')).toThrow(
      'Expected `parent` to be of type `object` but received type `undefined`'
    );

    class Movie {}

    const movie = new Movie();

    const property = new Property('title', movie);
    expect(isProperty(property)).toBe(true);
    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(movie);
  });

  test('Basic forking', async () => {
    class Movie {}

    const movie = new Movie();

    const property = new Property('title', movie);

    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(movie);

    const forkedMovie = Object.create(movie);
    const forkedProperty = property.fork(forkedMovie);

    expect(forkedProperty.getName()).toBe('title');
    expect(forkedProperty.getParent()).toBe(forkedMovie);
  });
});
