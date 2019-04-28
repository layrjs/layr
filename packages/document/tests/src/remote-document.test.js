import {Registry, RegistryClient, RegistryServer} from '@storable/registry';
import {MemoryStore} from '@storable/memory-store';

import {RemoteDocument, LocalDocument, field, remoteMethod, serialize, deserialize} from '../../..';

describe('RemoteDocument', () => {
  describe('One remote registry', () => {
    const BaseMovie = Parent =>
      class extends Parent {
        @field('string') title;

        @field('string?') genre;

        @field('string?') country;

        @field('number') score = 0;
      };

    const registryServer = (() => {
      // Backend

      class Movie extends BaseMovie(LocalDocument) {
        async upvote() {
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
      const registry = new Registry({Movie, store});
      return new RegistryServer(registry, {
        serializer: serialize,
        deserializer: deserialize
      });
    })();

    // Frontend

    class Movie extends BaseMovie(RemoteDocument) {
      @remoteMethod() upvote;

      @remoteMethod() static getMaximumScore;
    }

    const remoteRegistry = new RegistryClient(registryServer, {
      serializer: serialize,
      deserializer: deserialize
    });
    const rootRegistry = new Registry({Movie, remoteRegistry});

    test('CRUD operations', async () => {
      // Create

      let registry = rootRegistry.fork();
      let movie = new registry.Movie({title: 'Inception', genre: 'action'});
      const id = movie.id;
      await movie.save();

      // Read

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id);
      expect(movie instanceof registry.Movie).toBe(true);
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('Inception');
      expect(movie.genre).toBe('action');

      registry = rootRegistry.fork();
      await expect(registry.Movie.get('missing-id')).rejects.toThrow();
      registry = rootRegistry.fork();
      await expect(
        registry.Movie.get('missing-id', {throwIfNotFound: false})
      ).resolves.toBeUndefined();

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id, {fields: {title: true}}); // Partial read
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('Inception');
      expect(movie.genre).toBeUndefined();

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id, {fields: {}}); // Existence check
      expect(movie.id).toBe(id);
      expect(movie.title).toBeUndefined();
      expect(movie.genre).toBeUndefined();

      // Update

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id);
      movie.title = 'The Matrix';
      await movie.save();
      movie = await registry.Movie.get(id);
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('The Matrix');
      expect(movie.genre).toBe('action');

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id);
      movie.genre = undefined;
      await movie.save();
      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id);
      expect(movie.id).toBe(id);
      expect(movie.title).toBe('The Matrix');
      expect(movie.genre).toBeUndefined();

      // Delete

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id);
      await movie.delete();
      registry = rootRegistry.fork();
      movie = await registry.Movie.get(id, {throwIfNotFound: false});
      expect(movie).toBeUndefined();
    });

    test('Finding documents', async () => {
      let registry = rootRegistry.fork();
      await registry.Movie.deserialize({
        _new: true,
        _id: 'movie1',
        title: 'Inception',
        genre: 'action',
        country: 'USA'
      }).save();
      await registry.Movie.deserialize({
        _new: true,
        _id: 'movie2',
        title: 'Forrest Gump',
        genre: 'drama',
        country: 'USA'
      }).save();
      await registry.Movie.deserialize({
        _new: true,
        _id: 'movie3',
        title: 'Léon',
        genre: 'action',
        country: 'France'
      }).save();

      registry = rootRegistry.fork();
      let movies = await registry.Movie.find();
      expect(movies.map(movie => movie.id)).toEqual(['movie1', 'movie2', 'movie3']);

      registry = rootRegistry.fork();
      movies = await registry.Movie.find({filter: {genre: 'action'}});
      expect(movies.map(movie => movie.id)).toEqual(['movie1', 'movie3']);

      registry = rootRegistry.fork();
      movies = await registry.Movie.find({filter: {genre: 'action', country: 'France'}});
      expect(movies.map(movie => movie.id)).toEqual(['movie3']);

      registry = rootRegistry.fork();
      movies = await registry.Movie.find({filter: {genre: 'adventure'}});
      expect(movies.map(movie => movie.id)).toEqual([]);

      registry = rootRegistry.fork();
      movies = await registry.Movie.find({skip: 1, limit: 1});
      expect(movies.map(movie => movie.id)).toEqual(['movie2']);

      registry = rootRegistry.fork();
      movies = await registry.Movie.find({fields: {title: true}});
      expect(movies.map(movie => movie.serialize())).toEqual([
        {_type: 'Movie', _id: 'movie1', title: 'Inception'},
        {_type: 'Movie', _id: 'movie2', title: 'Forrest Gump'},
        {_type: 'Movie', _id: 'movie3', title: 'Léon'}
      ]);

      registry = rootRegistry.fork();
      for (const id of ['movie1', 'movie2', 'movie3']) {
        const movie = await registry.Movie.get(id);
        await movie.delete();
      }
    });

    test('Remote methods', async () => {
      const registry = rootRegistry.fork();
      const movie = new registry.Movie({title: 'Inception'});
      await movie.save();
      expect(movie.score).toBe(0);

      let previousScore = await movie.upvote();
      expect(previousScore).toBe(0);
      expect(movie.score).toBe(1);

      previousScore = await movie.upvote();
      expect(previousScore).toBe(1);
      expect(movie.score).toBe(2);

      const maximumScore = await registry.Movie.getMaximumScore();
      expect(maximumScore).toBe(1000);

      await movie.delete();
    });
  });

  describe('Multiple remote registries', () => {
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
      const registry = new Registry({Director, store});
      return new RegistryServer(registry, {
        serializer: serialize,
        deserializer: deserialize
      });
    })();

    const movieServer = (() => {
      // Movie backend

      class Movie extends BaseMovie(LocalDocument) {}

      class Director extends BaseDirector(RemoteDocument) {
        static remoteRegistry = 'directorClient';
      }

      const store = new MemoryStore();
      const directorClient = new RegistryClient(directorServer, {
        serializer: serialize,
        deserializer: deserialize
      });
      const registry = new Registry({Movie, Director, store, directorClient});
      return new RegistryServer(registry, {
        serializer: serialize,
        deserializer: deserialize
      });
    })();

    // Frontend

    class Movie extends BaseMovie(RemoteDocument) {
      static remoteRegistry = 'movieClient';
    }

    class Director extends BaseDirector(RemoteDocument) {
      static remoteRegistry = 'directorClient';
    }

    const movieClient = new RegistryClient(movieServer, {
      serializer: serialize,
      deserializer: deserialize
    });
    const directorClient = new RegistryClient(directorServer, {
      serializer: serialize,
      deserializer: deserialize
    });
    const rootRegistry = new Registry({Movie, Director, movieClient, directorClient});

    test('Handling documents', async () => {
      let registry = rootRegistry.fork();
      let movie = new registry.Movie({
        title: 'Inception',
        director: {fullName: 'Christopher Nolan'}
      });
      const movieId = movie.id;
      const directorId = movie.director.id;
      await movie.director.save();
      await movie.save();

      // We can fetch the director only
      registry = rootRegistry.fork();
      let director = await registry.Director.get(directorId);
      expect(director instanceof registry.Director).toBe(true);
      expect(director.id).toBe(directorId);
      expect(director.fullName).toBe('Christopher Nolan');

      // We can fetch both the movie and its director
      registry = rootRegistry.fork();
      movie = await registry.Movie.get(movieId);
      expect(movie instanceof registry.Movie).toBe(true);
      expect(movie.id).toBe(movieId);
      expect(movie.title).toBe('Inception');
      expect(movie.director instanceof registry.Director).toBe(true);
      expect(movie.director.id).toBe(directorId);
      expect(movie.director.fullName).toBe('Christopher Nolan');

      registry = rootRegistry.fork();
      movie = await registry.Movie.get(movieId);
      await movie.director.delete();
      await movie.delete();
      registry = rootRegistry.fork();
      movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
      expect(movie).toBeUndefined();
      director = await registry.Director.get(directorId, {throwIfNotFound: false});
      expect(director).toBeUndefined();
    });
  });
});
