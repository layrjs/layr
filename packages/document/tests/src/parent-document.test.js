import {Layer, LayerClient, LayerServer} from '@layr/layer';
import {MemoryStore} from '@layr/memory-store';

import {ParentDocument, LocalDocument, field, parentMethod, serialize, deserialize} from '../../..';

describe('ParentDocument', () => {
  describe('One parent layer', () => {
    const BaseMovie = Parent =>
      class extends Parent {
        @field('string') title;

        @field('string?') genre;

        @field('string?') country;

        @field('number') score = 0;
      };

    const layerServer = (() => {
      // Backend

      class Movie extends BaseMovie(LocalDocument) {
        async upvote() {
          await this.load({fields: {score: true}});
          const previousScore = this.score;
          this.score++;
          await this.save();
          return previousScore;
        }

        static async getMaximumScore() {
          return 1000;
        }
      }

      const store = new MemoryStore();
      const layer = new Layer({Movie, store});
      return new LayerServer(layer, {
        serializer: serialize,
        deserializer: deserialize
      });
    })();

    // Frontend

    class Movie extends BaseMovie(ParentDocument) {
      @parentMethod() upvote;

      @parentMethod() static getMaximumScore;
    }

    const parentLayer = new LayerClient(layerServer, {
      serializer: serialize,
      deserializer: deserialize
    });
    const rootLayer = new Layer({Movie, parentLayer});

    test('CRUD operations', async () => {
      // Create

      let layer = rootLayer.fork();
      let movie = new layer.Movie({title: 'Inception', genre: 'action'});
      const id = movie.id;
      expect(movie.getFieldSource('title')).toBe(layer);
      await movie.save();
      expect(movie.getFieldSource('title')).toBe(layerServer);

      // Read

      layer = rootLayer.fork();
      movie = await layer.Movie.get(id);
      expect(movie instanceof layer.Movie).toBe(true);
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('Inception');
      expect(movie.getFieldSource('title')).toBe(layerServer);
      expect(movie.genre).toBe('action');
      expect(movie.getFieldSource('genre')).toBe(layerServer);

      layer = rootLayer.fork();
      await expect(layer.Movie.get('missing-id')).rejects.toThrow();
      layer = rootLayer.fork();
      await expect(
        layer.Movie.get('missing-id', {throwIfNotFound: false})
      ).resolves.toBeUndefined();

      layer = rootLayer.fork();
      movie = await layer.Movie.get(id, {fields: {title: true}}); // Partial read
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('Inception');
      expect(movie.genre).toBeUndefined();

      layer = rootLayer.fork();
      movie = await layer.Movie.get(id, {fields: {}}); // Existence check
      expect(movie.id).toBe(id);
      expect(movie.title).toBeUndefined();
      expect(movie.genre).toBeUndefined();

      // Update

      layer = rootLayer.fork();
      movie = await layer.Movie.get(id);
      expect(movie.getFieldSource('title')).toBe(layerServer);
      movie.title = 'The Matrix';
      expect(movie.getFieldSource('title')).toBe(layer);
      await movie.save();
      expect(movie.getFieldSource('title')).toBe(layerServer);
      layer = rootLayer.fork();
      movie = await layer.Movie.get(id);
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('The Matrix');
      expect(movie.getFieldSource('title')).toBe(layerServer);
      expect(movie.genre).toBe('action');

      layer = rootLayer.fork();
      movie = await layer.Movie.get(id);
      expect(movie.getFieldSource('genre')).toBe(layerServer);
      movie.genre = undefined;
      expect(movie.getFieldSource('genre')).toBe(layer);
      await movie.save();
      expect(movie.getFieldSource('genre')).toBe(layerServer);
      layer = rootLayer.fork();
      movie = await layer.Movie.get(id);
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('The Matrix');
      expect(movie.genre).toBeUndefined();
      expect(movie.getFieldSource('genre')).toBe(layerServer);

      // Delete

      layer = rootLayer.fork();
      movie = await layer.Movie.get(id);
      await movie.delete();
      layer = rootLayer.fork();
      movie = await layer.Movie.get(id, {throwIfNotFound: false});
      expect(movie).toBeUndefined();
    });

    test('Finding documents', async () => {
      let layer = rootLayer.fork();
      await layer.Movie.deserialize({
        _new: true,
        _id: 'movie1',
        title: 'Inception',
        genre: 'action',
        country: 'USA'
      }).save();
      await layer.Movie.deserialize({
        _new: true,
        _id: 'movie2',
        title: 'Forrest Gump',
        genre: 'drama',
        country: 'USA'
      }).save();
      await layer.Movie.deserialize({
        _new: true,
        _id: 'movie3',
        title: 'Léon',
        genre: 'action',
        country: 'France'
      }).save();

      layer = rootLayer.fork();
      let movies = await layer.Movie.find();
      expect(movies.map(movie => movie.id)).toEqual(['movie1', 'movie2', 'movie3']);

      layer = rootLayer.fork();
      movies = await layer.Movie.find({filter: {genre: 'action'}});
      expect(movies.map(movie => movie.id)).toEqual(['movie1', 'movie3']);

      layer = rootLayer.fork();
      movies = await layer.Movie.find({filter: {genre: 'action', country: 'France'}});
      expect(movies.map(movie => movie.id)).toEqual(['movie3']);

      layer = rootLayer.fork();
      movies = await layer.Movie.find({filter: {genre: 'adventure'}});
      expect(movies.map(movie => movie.id)).toEqual([]);

      layer = rootLayer.fork();
      movies = await layer.Movie.find({skip: 1, limit: 1});
      expect(movies.map(movie => movie.id)).toEqual(['movie2']);

      layer = rootLayer.fork();
      movies = await layer.Movie.find({fields: {title: true}});
      expect(movies.map(movie => movie.serialize())).toEqual([
        {_type: 'Movie', _id: 'movie1', title: 'Inception'},
        {_type: 'Movie', _id: 'movie2', title: 'Forrest Gump'},
        {_type: 'Movie', _id: 'movie3', title: 'Léon'}
      ]);

      layer = rootLayer.fork();
      for (const id of ['movie1', 'movie2', 'movie3']) {
        const movie = await layer.Movie.get(id);
        await movie.delete();
      }
    });

    test('Parent methods', async () => {
      const layer = rootLayer.fork();
      const movie = new layer.Movie({title: 'Inception'});
      await movie.save();
      expect(movie.score).toBe(0);

      let previousScore = await movie.upvote();
      expect(previousScore).toBe(0);
      expect(movie.score).toBe(1);

      previousScore = await movie.upvote();
      expect(previousScore).toBe(1);
      expect(movie.score).toBe(2);

      const maximumScore = await layer.Movie.getMaximumScore();
      expect(maximumScore).toBe(1000);

      await movie.delete();
    });
  });

  describe('Multiple parent registries', () => {
    const BaseMovie = Parent =>
      class extends Parent {
        @field('string') title;

        @field('Director') director;
      };

    const BaseDirector = Parent =>
      class extends Parent {
        @field('string') fullName;
      };

    const directorServer = (() => {
      // Director backend

      class Director extends BaseDirector(LocalDocument) {}

      const store = new MemoryStore();
      const layer = new Layer({Director, store});
      return new LayerServer(layer, {
        serializer: serialize,
        deserializer: deserialize
      });
    })();

    const movieServer = (() => {
      // Movie backend

      class Movie extends BaseMovie(LocalDocument) {}

      class Director extends BaseDirector(ParentDocument) {
        static parentLayer = 'directorClient';
      }

      const store = new MemoryStore();
      const directorClient = new LayerClient(directorServer, {
        serializer: serialize,
        deserializer: deserialize
      });
      const layer = new Layer({Movie, Director, store, directorClient});
      return new LayerServer(layer, {
        serializer: serialize,
        deserializer: deserialize
      });
    })();

    // Frontend

    class Movie extends BaseMovie(ParentDocument) {
      static parentLayer = 'movieClient';
    }

    class Director extends BaseDirector(ParentDocument) {
      static parentLayer = 'directorClient';
    }

    const movieClient = new LayerClient(movieServer, {
      serializer: serialize,
      deserializer: deserialize
    });
    const directorClient = new LayerClient(directorServer, {
      serializer: serialize,
      deserializer: deserialize
    });
    const rootLayer = new Layer({Movie, Director, movieClient, directorClient});

    test('Handling documents', async () => {
      let layer = rootLayer.fork();
      let movie = new layer.Movie({
        title: 'Inception',
        director: {fullName: 'Christopher Nolan'}
      });
      const movieId = movie.id;
      const directorId = movie.director.id;
      await movie.director.save();
      await movie.save();

      // We can fetch the director only
      layer = rootLayer.fork();
      let director = await layer.Director.get(directorId);
      expect(director instanceof layer.Director).toBe(true);
      expect(director.id).toBe(directorId);
      expect(director.fullName).toBe('Christopher Nolan');

      // We can fetch both the movie and its director
      layer = rootLayer.fork();
      movie = await layer.Movie.get(movieId);
      expect(movie instanceof layer.Movie).toBe(true);
      expect(movie.id).toBe(movieId);
      expect(movie.title).toBe('Inception');
      expect(movie.director instanceof layer.Director).toBe(true);
      expect(movie.director.id).toBe(directorId);
      expect(movie.director.fullName).toBe('Christopher Nolan');

      layer = rootLayer.fork();
      movie = await layer.Movie.get(movieId);
      await movie.director.delete();
      await movie.delete();
      layer = rootLayer.fork();
      movie = await layer.Movie.get(movieId, {throwIfNotFound: false});
      expect(movie).toBeUndefined();
      director = await layer.Director.get(directorId, {throwIfNotFound: false});
      expect(director).toBeUndefined();
    });
  });
});
