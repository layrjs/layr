import {Model, attribute, serialize} from '../../..';

describe('Serialization', () => {
  test('Model instances', async () => {
    class Movie extends Model {
      @attribute('string') title;
      @attribute('string?') country;
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
