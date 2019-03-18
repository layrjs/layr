import {Registry} from '@storable/registry';
import {MemoryStore} from '@storable/memory-store';

import {Document, Subdocument, Model, field} from '../../..';

describe('@storable/document', () => {
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

  test('Subdocuments', async () => {
    class Movie extends Document {
      @field('string') title;

      @field('Trailer') trailer;
    }

    class Trailer extends Subdocument {
      @field('string') url;

      @field('number') duration;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Trailer, store});

    // Let's create both a 'Movie' and a 'Trailer'
    let movie = new registry.Movie({
      title: 'Inception',
      trailer: {url: 'https://www.youtube.com/watch?v=YoHD9XEInc0', duration: 30}
    });
    const movieId = movie.id;
    expect(typeof movieId === 'string').toBe(true);
    expect(movieId !== '').toBe(true);
    const trailerId = movie.trailer.id;
    expect(typeof trailerId === 'string').toBe(true);
    expect(trailerId !== '').toBe(true);
    await movie.save();

    // Will fetch both the 'Movie' document and its 'Trailer' subdocument
    movie = await registry.Movie.get(movieId);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer instanceof registry.Trailer).toBe(true);
    expect(movie.trailer.id).toBe(trailerId);
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=YoHD9XEInc0');
    expect(movie.trailer.duration).toBe(30);

    // Will fetch the 'Movie' document only
    movie = await registry.Movie.get(movieId, {return: {title: true}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer).toBeUndefined();

    // Will fetch the 'Movie' document and the id of its trailer
    movie = await registry.Movie.get(movieId, {return: {title: true, trailer: {}}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer instanceof registry.Trailer).toBe(true);
    expect(movie.trailer.id).toBe(trailerId);
    expect(movie.trailer.url).toBeUndefined();

    // The trailer can be partially modified
    movie.trailer.url = 'https://www.youtube.com/watch?v=8hP9D6kZseM';
    await movie.save();
    movie = await registry.Movie.get(movieId);
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=8hP9D6kZseM');
    expect(movie.trailer.duration).toBe(30);

    // The trailer can be fully replaced
    movie.trailer = {url: 'https://www.youtube.com/watch?v=YoHD9XEInc0'};
    const newTrailerId = movie.trailer.id;
    expect(typeof newTrailerId === 'string').toBe(true);
    expect(newTrailerId !== '').toBe(true);
    expect(newTrailerId).not.toBe(trailerId); // The trailer got a new id
    await movie.save();
    movie = await registry.Movie.get(movieId);
    expect(movie.trailer.id).toBe(newTrailerId);
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=YoHD9XEInc0');
    expect(movie.trailer.duration).toBeUndefined();

    // Will delete both the movie document and its trailer subdocument
    await movie.delete();
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
  });

  test('Referenced documents', async () => {
    class Movie extends Document {
      @field('string') title;

      @field('Director') director;
    }

    class Director extends Document {
      @field('string') fullName;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Director, store});

    let movie = new registry.Movie({title: 'Inception', director: {fullName: 'Christopher Nolan'}});
    const movieId = movie.id;
    const directorId = movie.director.id;
    await movie.director.save();
    await movie.save();

    // The directory has been saved independently
    let director = await registry.Director.get(directorId);
    expect(director instanceof registry.Director).toBe(true);
    expect(director.id).toBe(directorId);
    expect(director.fullName).toBe('Christopher Nolan');

    // Will fetch both the 'Movie' and its director
    movie = await registry.Movie.get(movieId);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director instanceof registry.Director).toBe(true);
    expect(movie.director.id).toBe(directorId);
    expect(movie.director.fullName).toBe('Christopher Nolan');

    // The director can be replaced
    let newDirector = new registry.Director({fullName: 'C. Nolan'});
    const newDirectorId = newDirector.id;
    expect(newDirectorId).not.toBe(directorId);
    await newDirector.save();
    movie.director = newDirector;
    await movie.save();
    movie = await registry.Movie.get(movieId);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director.id).toBe(newDirectorId);
    expect(movie.director.fullName).toBe('C. Nolan');

    // Let's delete everything
    await movie.delete();
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined(); // The movie is gone
    newDirector = await registry.Director.get(newDirectorId);
    expect(newDirector instanceof registry.Director).toBe(true); // But the director is still there
    expect(newDirector.id).toBe(newDirectorId);
    await newDirector.delete(); // So let's delete it
    director = await registry.Director.get(directorId); // Let's also delete the first director
    await director.delete();
  });

  test('Arrays of referenced document', async () => {
    class Movie extends Document {
      @field('string') title;

      @field('Actor[]') actors;
    }

    class Actor extends Document {
      @field('string') fullName;
    }

    const store = new MemoryStore();
    const registry = new Registry({Movie, Actor, store});

    // Let's create both a 'Movie' and some 'Actor'
    let movie = new registry.Movie({
      title: 'Inception',
      actors: [{fullName: 'Leonardo DiCaprio'}, {fullName: 'Joseph Gordon-Levitt'}]
    });
    const movieId = movie.id;
    const actorIds = movie.actors.map(actor => actor.id);
    for (const actor of movie.actors) {
      await actor.save();
    }
    await movie.save();

    // The actors can be fetched directly from the 'Actor' collection
    let actor = await registry.Actor.get(actorIds[0]);
    expect(actor instanceof registry.Actor).toBe(true);
    expect(actor.id).toBe(actorIds[0]);
    expect(actor.fullName).toBe('Leonardo DiCaprio');
    actor = await registry.Actor.get(actorIds[1]);
    expect(actor instanceof registry.Actor).toBe(true);
    expect(actor.id).toBe(actorIds[1]);
    expect(actor.fullName).toBe('Joseph Gordon-Levitt');

    // Will fetch both 'Movie' and 'Actor' documents
    movie = await registry.Movie.get(movieId);
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.actors[0] instanceof registry.Actor).toBe(true);
    expect(movie.actors[0].id).toBe(actorIds[0]);
    expect(movie.actors[0].fullName).toBe('Leonardo DiCaprio');
    expect(movie.actors[1] instanceof registry.Actor).toBe(true);
    expect(movie.actors[1].id).toBe(actorIds[1]);
    expect(movie.actors[1].fullName).toBe('Joseph Gordon-Levitt');

    // Will fetch 'Movie' document only
    movie = await registry.Movie.get(movieId, {return: {title: true}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.actors).toBeUndefined();

    // Will fetch 'Movie' document and the ids of the actors
    movie = await registry.Movie.get(movieId, {return: {title: true, actors: [{}]}});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.actors[0] instanceof registry.Actor).toBe(true);
    expect(movie.actors[0].id).toBe(actorIds[0]);
    expect(movie.actors[0].fullName).toBeUndefined();
    expect(movie.actors[1] instanceof registry.Actor).toBe(true);
    expect(movie.actors[1].id).toBe(actorIds[1]);
    expect(movie.actors[1].fullName).toBeUndefined();

    // An actor can be modified through its parent movie
    movie.actors[0].fullName = 'L. DiCaprio';
    await movie.actors[0].save();
    actor = await registry.Actor.get(actorIds[0]);
    expect(actor.fullName).toBe('L. DiCaprio');

    // Will delete the movie and its actors
    for (const actor of movie.actors) {
      await actor.delete();
    }
    await movie.delete();
    movie = await registry.Movie.get(movieId, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
    actor = await registry.Actor.get(actorIds[0], {throwIfNotFound: false});
    expect(actor).toBeUndefined();
    actor = await registry.Actor.get(actorIds[1], {throwIfNotFound: false});
    expect(actor).toBeUndefined();
  });

  test('Hooks', async () => {
    const HookMixin = Base =>
      class extends Base {
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
      };

    class Movie extends HookMixin(Document) {
      @field('string') title;

      @field('Trailer') trailer;
    }

    class Trailer extends HookMixin(Subdocument) {
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
