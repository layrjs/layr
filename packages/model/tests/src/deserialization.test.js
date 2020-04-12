import {Model, attribute} from '../../..';

describe('Deserialization', () => {
  test('Model instances', async () => {
    class Movie extends Model {
      @attribute('string') title;
      @attribute('string?') country;
    }

    let movie = Movie.instantiate().deserialize({title: 'Inception', country: 'USA'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    movie = Movie.instantiate().deserialize({country: 'USA'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.getModelAttribute('title').isSet()).toBe(false);
    expect(movie.country).toBe('USA');

    movie = Movie.instantiate({}, {isNew: true}).deserialize({
      __new: true,
      title: 'Inception',
      country: 'USA'
    });

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');
  });
});
