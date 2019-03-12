import {Registry} from '@superstore/registry';
import {MemoryStore} from '@superstore/memory-store';

import {Document, Model, field} from '../../..';

describe('@superstore/document', () => {
  test('CRUD operations', async () => {
    class Movie extends Document {
      @field('string') title;

      @field('number') year;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, store});

    // Create

    let movie = new registry.Movie({title: 'Inception', year: 2010});
    const id = movie.id; // An 'id' should have been generated automatically
    expect(typeof id === 'string').toBe(true);
    expect(id !== '').toBe(true);
    await movie.save();

    // Read

    movie = await registry.Movie.get(id);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);

    await expect(registry.Movie.get('missing-id')).rejects.toThrow();
    await expect(
      registry.Movie.get('missing-id', {throwIfNotFound: false})
    ).resolves.toBeUndefined();

    movie = await registry.Movie.get(id, {return: {title: true}}); // Partial read
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBeUndefined();

    movie = await registry.Movie.get(id, {return: false}); // Existence check
    expect(movie.id).toBe(id);
    expect(movie.title).toBeUndefined();
    expect(movie.year).toBeUndefined();

    // Update

    movie.title = 'The Matrix';
    await movie.save();
    movie = await registry.Movie.get(id);
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBe(2010);

    movie.year = undefined;
    await movie.save();
    movie = await registry.Movie.get(id);
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBeUndefined();

    // Delete

    await movie.delete();
    movie = await registry.Movie.get(id, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
  });

  test('Nesting models', async () => {
    class Movie extends Document {
      @field('string') title;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, TechnicalSpecs, store});

    let movie = new registry.Movie({title: 'Inception', technicalSpecs: {aspectRatio: '2.39:1'}});
    const id = movie.id;
    await movie.save();

    movie = await registry.Movie.get(id);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('Inception');
    expect(movie.technicalSpecs instanceof registry.TechnicalSpecs).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');

    await movie.delete();
    movie = await registry.Movie.get(id, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
  });

  test('Nesting documents', async () => {
    class Movie extends Document {
      @field('string') title;

      @field('Trailer', {isOwned: true}) trailer;
    }

    class Trailer extends Document {
      @field('string') url;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Trailer, store});

    // Let's create both a 'Movie' and a 'Trailer'
    let movie = new registry.Movie({
      title: 'Inception',
      trailer: {url: 'https://www.youtube.com/watch?v=YoHD9XEInc0'}
    });
    const movieId = movie.id;
    const trailerId = movie.trailer.id;
    await movie.save();

    // The trailer can be fetched from the 'Trailer' collection
    let trailer = await registry.Trailer.get(trailerId);
    expect(trailer instanceof registry.Trailer).toBe(true);
    expect(trailer.id).toBe(trailerId);
    expect(trailer.url).toBe('https://www.youtube.com/watch?v=YoHD9XEInc0');

    // Will fetch both 'Movie' and 'Trailer' documents
    movie = await registry.Movie.get(movieId);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer instanceof registry.Trailer).toBe(true);
    expect(movie.trailer.id).toBe(trailerId);
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=YoHD9XEInc0');

    // Will fetch 'Movie' document only
    movie = await registry.Movie.get(movieId, {return: {title: true}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer).toBeUndefined();

    // Will fetch 'Movie' document and trailer's id
    movie = await registry.Movie.get(movieId, {return: {title: true, trailer: {}}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer instanceof registry.Trailer).toBe(true);
    expect(movie.trailer.id).toBe(trailerId);
    expect(movie.trailer.url).toBeUndefined();

    // // The trailer can be modified through its parent movie
    movie.trailer.url = 'https://www.youtube.com/watch?v=8hP9D6kZseM';
    await movie.save();
    trailer = await registry.Trailer.get(trailerId);
    expect(trailer.url).toBe('https://www.youtube.com/watch?v=8hP9D6kZseM');

    // Will delete both the movie and its trailer
    await movie.delete();
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
    trailer = await registry.Trailer.get(trailerId, {throwIfNotFound: false});
    expect(trailer).toBeUndefined();
  });

  test('Referencing documents', async () => {
    // Except for deletion, referenced documents behave like nested documents

    class Movie extends Document {
      @field('string') title;

      @field('Person') director;
    }

    class Person extends Document {
      @field('string') fullName;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Person, store});

    let movie = new registry.Movie({title: 'Inception', director: {fullName: 'Christopher Nolan'}});
    const movieId = movie.id;
    const directorId = movie.director.id;
    await movie.save();

    await movie.delete();
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined(); // The movie is gone
    const director = await registry.Person.get(directorId);
    expect(director instanceof registry.Person).toBe(true); // But the director is still there
    expect(director.id).toBe(directorId);
  });

  test('Hooks', async () => {
    class HookedDocument extends Document {
      afterLoadCount = 0;

      beforeSaveCount = 0;

      afterSaveCount = 0;

      beforeDeleteCount = 0;

      afterDeleteCount = 0;

      async afterLoad(options) {
        await super.afterLoad(options);
        this.afterLoadCount++;
      }

      async beforeSave(options) {
        await super.beforeSave(options);
        this.beforeSaveCount++;
      }

      async afterSave(options) {
        await super.afterSave(options);
        this.afterSaveCount++;
      }

      async beforeDelete(options) {
        await super.beforeDelete(options);
        this.beforeDeleteCount++;
      }

      async afterDelete(options) {
        await super.afterDelete(options);
        this.afterDeleteCount++;
      }
    }

    class Movie extends HookedDocument {
      @field('string') title;

      @field('Trailer', {isOwned: true}) trailer;
    }

    class Trailer extends HookedDocument {
      @field('string') url;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Trailer, store});

    let movie = new registry.Movie({
      title: 'Inception',
      trailer: {url: 'https://www.youtube.com/watch?v=YoHD9XEInc0'}
    });
    const movieId = movie.id;
    expect(movie.afterLoadCount).toBe(0);
    expect(movie.beforeSaveCount).toBe(0);
    expect(movie.afterSaveCount).toBe(0);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.trailer.afterLoadCount).toBe(0);
    expect(movie.trailer.beforeSaveCount).toBe(0);
    expect(movie.trailer.afterSaveCount).toBe(0);
    expect(movie.trailer.beforeDeleteCount).toBe(0);
    expect(movie.trailer.afterDeleteCount).toBe(0);

    await movie.save();
    expect(movie.afterLoadCount).toBe(0);
    expect(movie.beforeSaveCount).toBe(1);
    expect(movie.afterSaveCount).toBe(1);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.trailer.afterLoadCount).toBe(0);
    expect(movie.trailer.beforeSaveCount).toBe(1);
    expect(movie.trailer.afterSaveCount).toBe(1);
    expect(movie.trailer.beforeDeleteCount).toBe(0);
    expect(movie.trailer.afterDeleteCount).toBe(0);

    movie = await registry.Movie.get(movieId);
    expect(movie.afterLoadCount).toBe(1);
    expect(movie.beforeSaveCount).toBe(0);
    expect(movie.afterSaveCount).toBe(0);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.trailer.afterLoadCount).toBe(1);
    expect(movie.trailer.beforeSaveCount).toBe(0);
    expect(movie.trailer.afterSaveCount).toBe(0);
    expect(movie.trailer.beforeDeleteCount).toBe(0);
    expect(movie.trailer.afterDeleteCount).toBe(0);

    movie.trailer.url = 'https://www.youtube.com/watch?v=8hP9D6kZseM';
    await movie.save();
    expect(movie.afterLoadCount).toBe(1);
    expect(movie.beforeSaveCount).toBe(1);
    expect(movie.afterSaveCount).toBe(1);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.trailer.afterLoadCount).toBe(1);
    expect(movie.trailer.beforeSaveCount).toBe(1);
    expect(movie.trailer.afterSaveCount).toBe(1);
    expect(movie.trailer.beforeDeleteCount).toBe(0);
    expect(movie.trailer.afterDeleteCount).toBe(0);

    await movie.delete();
    expect(movie.afterLoadCount).toBe(1);
    expect(movie.beforeSaveCount).toBe(1);
    expect(movie.afterSaveCount).toBe(1);
    expect(movie.beforeDeleteCount).toBe(1);
    expect(movie.afterDeleteCount).toBe(1);
    expect(movie.trailer.afterLoadCount).toBe(1);
    expect(movie.trailer.beforeSaveCount).toBe(1);
    expect(movie.trailer.afterSaveCount).toBe(1);
    expect(movie.trailer.beforeDeleteCount).toBe(1);
    expect(movie.trailer.afterDeleteCount).toBe(1);
  });
});
