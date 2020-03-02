import {Model, attribute, deserialize} from '../../..';

describe('Deserialization', () => {
  test('Model instances', async () => {
    class Movie extends Model() {
      @attribute('string') title;
      @attribute('string?') country;
    }

    let movie = deserialize(
      {__component: 'movie', title: 'Inception', country: 'USA'},
      {knownComponents: [Movie]}
    );

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    movie = deserialize({__component: 'movie', country: 'USA'}, {knownComponents: [Movie]});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.getModelAttribute('title').isSet()).toBe(false);
    expect(movie.country).toBe('USA');

    movie = deserialize(
      {__component: 'movie', __new: true, title: 'Inception', country: 'USA'},
      {knownComponents: [Movie]}
    );

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    expect(() =>
      deserialize({__component: 'movie', __new: true, country: 'USA'}, {knownComponents: [Movie]})
    ).toThrow(
      "Cannot assign a value of an unexpected type to the modelAttribute 'title' (expected type: 'string', received type: 'undefined')"
    );
  });
});
