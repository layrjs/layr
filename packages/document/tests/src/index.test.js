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

      @field('Person') director;
    }

    class Person extends Document {
      @field('string') fullName;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Person, store});

    // Let's create both a 'Movie' and a 'Person'
    let movie = new registry.Movie({title: 'Inception', director: {fullName: 'Christopher Nolan'}});
    let movieId = movie.id;
    const directorId = movie.director.id;
    await movie.save();

    // The director can be fetched from 'Person'
    let director = await registry.Person.get(directorId);
    expect(director instanceof registry.Person).toBe(true);
    expect(director.id).toBe(directorId);
    expect(director.fullName).toBe('Christopher Nolan');

    // Will fetch both 'Movie' and 'Person'
    movie = await registry.Movie.get(movieId);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director instanceof registry.Person).toBe(true);
    expect(movie.director.id).toBe(directorId);
    expect(movie.director.fullName).toBe('Christopher Nolan');

    // Will fetch 'Movie' only
    movie = await registry.Movie.get(movieId, {return: {title: true}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director).toBeUndefined();

    // Will fetch 'Movie' and director's id
    movie = await registry.Movie.get(movieId, {return: {title: true, director: {}}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director instanceof registry.Person).toBe(true);
    expect(movie.director.id).toBe(directorId);
    expect(movie.director.fullName).toBeUndefined();

    // // The director can be modified through its 'Movie' parent
    movie.director.fullName = 'C. Nolan';
    movie.touch('director'); // For now, it is necessary to specify when a nested document has been modified
    await movie.save();
    director = await registry.Person.get(directorId);
    expect(director.fullName).toBe('C. Nolan');

    // Will delete the 'Movie' only
    await movie.delete();
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
    director = await registry.Person.get(directorId, {throwIfNotFound: false});
    expect(director instanceof registry.Person).toBe(true);
    expect(director.id).toBe(directorId);

    // Let's recreate the movie so we can test cascaded delete
    movie = new registry.Movie({title: 'Inception', director});
    movieId = movie.id;
    await movie.save();

    // Will delete both the 'Movie' and its director
    await movie.delete({cascade: true});
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
    director = await registry.Person.get(directorId, {throwIfNotFound: false});
    expect(director).toBeUndefined();
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

      @field('Person') director;
    }

    class Person extends HookedDocument {
      @field('string') fullName;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Person, store});

    let movie = new registry.Movie({title: 'Inception', director: {fullName: 'Christopher Nolan'}});
    const movieId = movie.id;
    expect(movie.afterLoadCount).toBe(0);
    expect(movie.beforeSaveCount).toBe(0);
    expect(movie.afterSaveCount).toBe(0);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.director.afterLoadCount).toBe(0);
    expect(movie.director.beforeSaveCount).toBe(0);
    expect(movie.director.afterSaveCount).toBe(0);
    expect(movie.director.beforeDeleteCount).toBe(0);
    expect(movie.director.afterDeleteCount).toBe(0);

    await movie.save();
    expect(movie.afterLoadCount).toBe(0);
    expect(movie.beforeSaveCount).toBe(1);
    expect(movie.afterSaveCount).toBe(1);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.director.afterLoadCount).toBe(0);
    expect(movie.director.beforeSaveCount).toBe(1);
    expect(movie.director.afterSaveCount).toBe(1);
    expect(movie.director.beforeDeleteCount).toBe(0);
    expect(movie.director.afterDeleteCount).toBe(0);

    movie = await registry.Movie.get(movieId);
    expect(movie.afterLoadCount).toBe(1);
    expect(movie.beforeSaveCount).toBe(0);
    expect(movie.afterSaveCount).toBe(0);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.director.afterLoadCount).toBe(1);
    expect(movie.director.beforeSaveCount).toBe(0);
    expect(movie.director.afterSaveCount).toBe(0);
    expect(movie.director.beforeDeleteCount).toBe(0);
    expect(movie.director.afterDeleteCount).toBe(0);

    movie.director.fullName = 'C. Nolan';
    movie.touch('director');
    await movie.save();
    expect(movie.afterLoadCount).toBe(1);
    expect(movie.beforeSaveCount).toBe(1);
    expect(movie.afterSaveCount).toBe(1);
    expect(movie.beforeDeleteCount).toBe(0);
    expect(movie.afterDeleteCount).toBe(0);
    expect(movie.director.afterLoadCount).toBe(1);
    expect(movie.director.beforeSaveCount).toBe(1);
    expect(movie.director.afterSaveCount).toBe(1);
    expect(movie.director.beforeDeleteCount).toBe(0);
    expect(movie.director.afterDeleteCount).toBe(0);

    await movie.delete({cascade: true});
    expect(movie.afterLoadCount).toBe(1);
    expect(movie.beforeSaveCount).toBe(1);
    expect(movie.afterSaveCount).toBe(1);
    expect(movie.beforeDeleteCount).toBe(1);
    expect(movie.afterDeleteCount).toBe(1);
    expect(movie.director.afterLoadCount).toBe(1);
    expect(movie.director.beforeSaveCount).toBe(1);
    expect(movie.director.afterSaveCount).toBe(1);
    expect(movie.director.beforeDeleteCount).toBe(1);
    expect(movie.director.afterDeleteCount).toBe(1);
  });
});
