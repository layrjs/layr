import {Model, attribute} from '../../..';

describe('Deserialization', () => {
  test('Model instances', async () => {
    class Movie extends Model {
      @attribute('string') title;
      @attribute('string?') country;
    }

    let movie = Movie.prototype.deserialize({title: 'Inception', country: 'USA'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    movie = Movie.prototype.deserialize({country: 'USA'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.getModelAttribute('title').isSet()).toBe(false);
    expect(movie.country).toBe('USA');

    movie = Movie.prototype.deserialize({__new: true, title: 'Inception', country: 'USA'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    expect(() => Movie.prototype.deserialize({__new: true, country: 'USA'})).toThrow(
      "Cannot assign a value of an unexpected type (model name: 'movie', attribute name: 'title', expected type: 'string', received type: 'undefined')"
    );
  });
});
