import {Layer} from '@layr/layer';

import {EntityModel, field} from '../../..';

describe('EntityModel', () => {
  test('Identity mapping', () => {
    class Movie extends EntityModel {
      constructor(object, options) {
        super(object, options);
        this.counter = 0;
      }

      @field('string') title;

      @field('number') year;
    }

    const layer = new Layer({Movie});

    const movie = new layer.Movie({title: 'Inception', year: 2010});
    const id = movie.id;
    expect(movie.counter).toBe(0);
    movie.counter++;
    expect(movie.counter).toBe(1);

    const movie2 = layer.Movie.deserialize({_id: id});
    expect(movie2).toBe(movie); // Since the movie was in the identity map, we got the same object
    expect(movie2.title).toBe('Inception');
    expect(movie2.year).toBe(2010);
    expect(movie.counter).toBe(1); // Movie's constructor has not been called a second time

    layer.Movie.deserialize({_id: id, title: 'The Matrix'});
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBe(2010);

    layer.Movie.deserialize({_id: id, year: 1999});
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBe(1999);

    layer.Movie.deserialize({_id: id, year: null});
    expect(movie.year).toBeUndefined();
  });

  test('Serialization', () => {
    class Movie extends EntityModel {
      @field('string?') title;

      @field('number?') year;

      @field('Director?') director;
    }

    class Director extends EntityModel {
      @field('string') fullName;
    }

    const layer = new Layer({Movie, Director});

    const movie = new layer.Movie({
      id: 'm1',
      title: 'Inception',
      year: 2010,
      director: layer.Director.deserialize({_id: 'd1', fullName: 'Christopher Nolan'})
    });

    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      _id: 'm1',
      title: 'Inception',
      year: 2010,
      director: {_type: 'Director', _id: 'd1', _ref: true}
    });

    expect(movie.director.serialize()).toEqual({
      _type: 'Director',
      _id: 'd1',
      fullName: 'Christopher Nolan'
    });
  });
});
