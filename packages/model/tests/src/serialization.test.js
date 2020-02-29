import {Model, field, serialize} from '../../..';

describe('Serialization', () => {
  test('Model instances', async () => {
    class Movie extends Model() {
      @field('string') title;
      @field('string?') country;
    }

    const movie = new Movie({title: 'Inception'});

    expect(serialize(movie, {knownComponents: [Movie]})).toEqual({
      __component: 'movie',
      __new: true,
      title: 'Inception',
      country: {__undefined: true}
    });
  });
});
