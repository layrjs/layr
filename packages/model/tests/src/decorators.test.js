import {isAttribute} from '@liaison/component';

import {Model, attribute, isModelAttribute} from '../../..';

describe('Decorators', () => {
  test('@attribute()', async () => {
    class Movie extends Model {
      @attribute('number?') static limit = 100;
      @attribute('string?') static token;
      @attribute() static anything;

      @attribute('string?') title = '';
      @attribute('string?') country;
    }

    let classModelAttribute = Movie.getModelAttribute('limit');

    expect(isModelAttribute(classModelAttribute)).toBe(true);
    expect(classModelAttribute.getName()).toBe('limit');
    expect(classModelAttribute.getParent()).toBe(Movie);
    expect(classModelAttribute.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    classModelAttribute = Movie.getModelAttribute('token');

    expect(isModelAttribute(classModelAttribute)).toBe(true);
    expect(classModelAttribute.getName()).toBe('token');
    expect(classModelAttribute.getParent()).toBe(Movie);
    expect(classModelAttribute.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    const classAttribute = Movie.getAttribute('anything');

    expect(isAttribute(classAttribute)).toBe(true);
    expect(isModelAttribute(classAttribute)).toBe(false);
    expect(classAttribute.getName()).toBe('anything');
    expect(classAttribute.getParent()).toBe(Movie);
    expect(classAttribute.getValue()).toBeUndefined();
    expect(Movie.anything).toBeUndefined();

    let prototypeModelAttribute = Movie.prototype.getModelAttribute('title');

    expect(isModelAttribute(prototypeModelAttribute)).toBe(true);
    expect(prototypeModelAttribute.getName()).toBe('title');
    expect(prototypeModelAttribute.getParent()).toBe(Movie.prototype);
    expect(prototypeModelAttribute.isSet()).toBe(false);

    prototypeModelAttribute = Movie.prototype.getModelAttribute('country');

    expect(isModelAttribute(prototypeModelAttribute)).toBe(true);
    expect(prototypeModelAttribute.getName()).toBe('country');
    expect(prototypeModelAttribute.getParent()).toBe(Movie.prototype);
    expect(prototypeModelAttribute.isSet()).toBe(false);

    const movie = new Movie();

    let instanceModelAttribute = movie.getModelAttribute('title');

    expect(isModelAttribute(instanceModelAttribute)).toBe(true);
    expect(instanceModelAttribute.getName()).toBe('title');
    expect(instanceModelAttribute.getParent()).toBe(movie);
    expect(instanceModelAttribute.getValue()).toBe('');
    expect(movie.title).toBe('');

    instanceModelAttribute = movie.getModelAttribute('country');

    expect(isModelAttribute(instanceModelAttribute)).toBe(true);
    expect(instanceModelAttribute.getName()).toBe('country');
    expect(instanceModelAttribute.getParent()).toBe(movie);
    expect(instanceModelAttribute.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    expect(() => Movie.getModelAttribute('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getModelAttribute('offset', {throwIfMissing: false})).toBeUndefined();

    expect(
      () =>
        class Film extends Movie {
          @attribute('string') static find() {}
        }
    ).toThrow(
      "@attribute() cannot be used without an attribute declaration (property name: 'find')"
    );

    class Film extends Movie {
      @attribute('number?') static limit;
      @attribute('string?') static token = '';

      @attribute('string?') title;
      @attribute('string?') country = '';
    }

    classModelAttribute = Film.getModelAttribute('limit');

    expect(isModelAttribute(classModelAttribute)).toBe(true);
    expect(classModelAttribute.getName()).toBe('limit');
    expect(classModelAttribute.getParent()).toBe(Film);
    expect(classModelAttribute.getValue()).toBeUndefined();
    expect(Film.limit).toBeUndefined();

    classModelAttribute = Film.getModelAttribute('token');

    expect(isModelAttribute(classModelAttribute)).toBe(true);
    expect(classModelAttribute.getName()).toBe('token');
    expect(classModelAttribute.getParent()).toBe(Film);
    expect(classModelAttribute.getValue()).toBe('');
    expect(Film.token).toBe('');

    prototypeModelAttribute = Film.prototype.getModelAttribute('title');

    expect(isModelAttribute(prototypeModelAttribute)).toBe(true);
    expect(prototypeModelAttribute.getName()).toBe('title');
    expect(prototypeModelAttribute.getParent()).toBe(Film.prototype);
    expect(prototypeModelAttribute.isSet()).toBe(false);

    prototypeModelAttribute = Film.prototype.getModelAttribute('country');

    expect(isModelAttribute(prototypeModelAttribute)).toBe(true);
    expect(prototypeModelAttribute.getName()).toBe('country');
    expect(prototypeModelAttribute.getParent()).toBe(Film.prototype);
    expect(prototypeModelAttribute.isSet()).toBe(false);

    const film = new Film();

    instanceModelAttribute = film.getModelAttribute('title');

    expect(isModelAttribute(instanceModelAttribute)).toBe(true);
    expect(instanceModelAttribute.getName()).toBe('title');
    expect(instanceModelAttribute.getParent()).toBe(film);
    expect(instanceModelAttribute.getValue()).toBeUndefined();
    expect(film.title).toBeUndefined();

    instanceModelAttribute = film.getModelAttribute('country');

    expect(isModelAttribute(instanceModelAttribute)).toBe(true);
    expect(instanceModelAttribute.getName()).toBe('country');
    expect(instanceModelAttribute.getParent()).toBe(film);
    expect(instanceModelAttribute.getValue()).toBe('');
    expect(film.country).toBe('');
  });
});
