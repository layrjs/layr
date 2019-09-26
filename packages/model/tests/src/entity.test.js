import {Layer} from '@liaison/layer';

import {Entity, field} from '../../..';

describe('Entity', () => {
  test('Identity mapping', async () => {
    class Movie extends Entity {
      constructor(object, options) {
        super(object, options);
        this.counter = 0;
      }

      @field('string') title;

      @field('number') year;
    }

    const layer = new Layer({Movie});
    await layer.open();

    // With a new movie

    const newMovie = new layer.Movie({id: 'm1', title: 'Inception', year: 2010});
    expect(newMovie.id).toBe('m1');
    expect(newMovie.title).toBe('Inception');
    expect(newMovie.year).toBe(2010);
    expect(newMovie.counter).toBe(0);
    newMovie.counter++;
    expect(newMovie.counter).toBe(1);

    const newMovie2 = layer.Movie.$deserialize({_id: 'm1'});
    expect(newMovie2).toBe(newMovie); // Since the movie was in the identity map, we got the same object
    expect(newMovie.counter).toBe(1); // Movie's constructor has not been called a second time

    layer.Movie.$deserialize({_id: 'm1', title: 'The Matrix'});
    expect(newMovie.title).toBe('The Matrix');
    expect(newMovie.year).toBe(2010);

    layer.Movie.$deserialize({_id: 'm1', year: 1999});
    expect(newMovie.title).toBe('The Matrix');
    expect(newMovie.year).toBe(1999);

    layer.Movie.$deserialize({_id: 'm1', year: null});
    expect(newMovie.year).toBeUndefined();

    // With a deserialized movie

    // const oldMovie = layer.Movie.$deserialize({_id: 'm2', title: 'Inception', year: 2010});
    // expect(oldMovie.id).toBe('m2');
    // expect(oldMovie.title).toBe('Inception');
    // expect(oldMovie.year).toBe(2010);

    // const oldMovie2 = layer.Movie.$deserialize({_id: 'm2'});
    // expect(oldMovie2).toBe(oldMovie); // Since the movie was in the identity map, we got the same object
  });

  test('Serialization', async () => {
    class Movie extends Entity {
      @field('string') title;

      @field('number') year;

      @field('Director') director;
    }

    class Director extends Entity {
      @field('string') fullName;
    }

    const layer = new Layer({Movie, Director});
    await layer.open();

    const movie = new layer.Movie({
      id: 'm1',
      title: 'Inception',
      year: 2010,
      director: layer.Director.$deserialize({_id: 'd1', fullName: 'Christopher Nolan'})
    });

    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      _id: 'm1',
      title: 'Inception',
      year: 2010,
      director: {_type: 'Director', _id: 'd1', _ref: true}
    });

    expect(movie.director.$serialize()).toEqual({
      _type: 'Director',
      _id: 'd1',
      fullName: 'Christopher Nolan'
    });
  });
});
