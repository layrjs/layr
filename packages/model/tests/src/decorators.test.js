import {Model, field, isField} from '../../..';

describe('Decorators', () => {
  test('@field()', async () => {
    class Movie extends Model() {
      @field('number?') static limit = 100;
      @field('string?') static token;

      @field('string?') title = '';
      @field('string?') country;
    }

    let classField = Movie.getField('limit');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('limit');
    expect(classField.getParent()).toBe(Movie);
    expect(classField.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    classField = Movie.getField('token');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('token');
    expect(classField.getParent()).toBe(Movie);
    expect(classField.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    let prototypeField = Movie.prototype.getField('title');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('title');
    expect(prototypeField.getParent()).toBe(Movie.prototype);
    expect(prototypeField.isSet()).toBe(false);

    prototypeField = Movie.prototype.getField('country');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('country');
    expect(prototypeField.getParent()).toBe(Movie.prototype);
    expect(prototypeField.isSet()).toBe(false);

    const movie = new Movie();

    let instanceField = movie.getField('title');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('title');
    expect(instanceField.getParent()).toBe(movie);
    expect(instanceField.getValue()).toBe('');
    expect(movie.title).toBe('');

    instanceField = movie.getField('country');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('country');
    expect(instanceField.getParent()).toBe(movie);
    expect(instanceField.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    expect(() => Movie.getField('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getField('offset', {throwIfMissing: false})).toBeUndefined();

    expect(
      () =>
        class Film extends Movie {
          @field('string') static find() {}
        }
    ).toThrow("@field() cannot be used without a field declaration (property name: 'find')");

    class Film extends Movie {
      @field('number?') static limit;
      @field('string?') static token = '';

      @field('string?') title;
      @field('string?') country = '';
    }

    classField = Film.getField('limit');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('limit');
    expect(classField.getParent()).toBe(Film);
    expect(classField.getValue()).toBeUndefined();
    expect(Film.limit).toBeUndefined();

    classField = Film.getField('token');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('token');
    expect(classField.getParent()).toBe(Film);
    expect(classField.getValue()).toBe('');
    expect(Film.token).toBe('');

    prototypeField = Film.prototype.getField('title');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('title');
    expect(prototypeField.getParent()).toBe(Film.prototype);
    expect(prototypeField.isSet()).toBe(false);

    prototypeField = Film.prototype.getField('country');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('country');
    expect(prototypeField.getParent()).toBe(Film.prototype);
    expect(prototypeField.isSet()).toBe(false);

    const film = new Film();

    instanceField = film.getField('title');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('title');
    expect(instanceField.getParent()).toBe(film);
    expect(instanceField.getValue()).toBeUndefined();
    expect(film.title).toBeUndefined();

    instanceField = film.getField('country');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('country');
    expect(instanceField.getParent()).toBe(film);
    expect(instanceField.getValue()).toBe('');
    expect(film.country).toBe('');
  });
});
