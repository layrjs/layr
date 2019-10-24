import {Layer, expose} from '@liaison/layer';
import {field} from '@liaison/model';

import {Entity} from '../../..';

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

  test('Forking', async () => {
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

    const director = layer.Director.$deserialize({_id: 'd1', fullName: 'Christopher Nolan'});
    const movie = layer.Movie.$deserialize({
      _id: 'm1',
      title: 'Inception',
      year: 2010,
      director: director.$serialize()
    });

    expect(movie.constructor.$layer === layer);

    const forkedLayer = layer.fork();
    const forkedMovie = forkedLayer.Movie.$deserialize({_id: 'm1'});

    expect(forkedMovie).not.toBe(movie);
    expect(forkedMovie.constructor).toBe(forkedLayer.Movie);
    expect(forkedMovie).toBeInstanceOf(forkedLayer.Movie);
    expect(forkedMovie).toBeInstanceOf(layer.Movie);
    expect(forkedMovie.constructor.$layer).toBe(forkedLayer);

    expect(forkedMovie.title).toBe('Inception');
    forkedMovie.title = 'Inception 2';
    expect(forkedMovie.title).toBe('Inception 2');
    expect(movie.title).toBe('Inception');

    expect(forkedMovie.$serialize()).toEqual({
      _type: 'Movie',
      _id: 'm1',
      title: 'Inception 2',
      year: 2010,
      director: {_type: 'Director', _id: 'd1', _ref: true}
    });

    const forkedDirector = forkedMovie.director;
    expect(forkedDirector).not.toBe(director);

    expect(forkedDirector.fullName).toBe('Christopher Nolan');
    forkedDirector.fullName = 'C. Nolan';
    expect(forkedDirector.fullName).toBe('C. Nolan');
    expect(director.fullName).toBe('Christopher Nolan');

    expect(forkedDirector.$serialize()).toEqual({
      _type: 'Director',
      _id: 'd1',
      fullName: 'C. Nolan'
    });
  });

  test('Property exposition', async () => {
    class BaseMovie extends Entity {
      @field('string') title;

      @field('number') rating;

      @field('string') secret;
    }

    async function createBackendLayer() {
      class Movie extends BaseMovie {
        @expose({get: true, set: true}) title;

        @expose({get: true}) rating;

        @expose({set: true}) secret;

        @expose({call: true}) getBackendFieldValue(name) {
          return this[name];
        }

        @expose({call: true}) setBackendFieldValue(name, value) {
          this[name] = value;
        }
      }

      return new Layer({Movie}, {name: 'backend'});
    }

    async function createFrontendLayer(backendLayer) {
      class Movie extends BaseMovie {}

      return new Layer({Movie}, {name: 'frontend', parent: backendLayer});
    }

    const backendLayer = await createBackendLayer();
    const frontendLayer = await createFrontendLayer(backendLayer);

    frontendLayer.open();

    const movie = new frontendLayer.Movie();

    movie.title = 'Inception';
    expect(movie.getBackendFieldValue('title')).toBe('Inception');

    movie.setBackendFieldValue('title', 'Inception 2');
    expect(movie.title).toBe('Inception 2');

    movie.rating = 8;
    expect(() => movie.getBackendFieldValue('rating')).toThrow(
      /Cannot get the value from an inactive field/
    );

    movie.setBackendFieldValue('rating', 9);
    expect(movie.rating).toBe(9);

    movie.setBackendFieldValue('secret', 'xyz123');
    expect(movie.$fieldIsActive('secret')).toBe(false);

    frontendLayer.close();
  });
});
