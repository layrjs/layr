import {Layer} from '@liaison/layer';
import {Model, Identity, field} from '@liaison/model';
import {MongoDBStore} from '@liaison/mongodb-store';
import {MongoMemoryServer} from 'mongodb-memory-server';

import {Storable, store} from '../../..';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 3 * 60 * 1000; // 3 minutes

let mongoDBServer;
let mongoDBStore;

beforeEach(async () => {
  mongoDBServer = new MongoMemoryServer();
  const connectionString = await mongoDBServer.getConnectionString();
  mongoDBStore = new MongoDBStore(connectionString);
  await mongoDBStore.connect();
});

afterEach(async () => {
  await mongoDBStore?.disconnect();
  await mongoDBServer?.stop();
});

describe('Storable', () => {
  test('CRUD operations', async () => {
    class Movie extends Storable(undefined, {storeName: 'mongoDBStore'}) {
      @store() @field('string') title;

      @store() @field('number?') year;

      @store() @field('string', {isUnique: true}) reference;

      @field('string?') secret;
    }

    const rootLayer = new Layer({Movie, mongoDBStore});
    await rootLayer.open();

    let layer = rootLayer.fork();
    let movie = new layer.Movie({title: 'Inception', year: 2010, secret: 'abc123'});
    const id = movie.id;

    const storableFields = movie.$createFieldMaskForStorableFields();
    expect(storableFields.serialize()).toEqual({title: true, year: true, reference: true});

    // === Create ===

    await expect(movie.$save()).rejects.toThrow(/Model validation failed/);
    movie.reference = 'movie-001';
    await movie.$save();

    // === Read ===

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);
    // expect(movie.$getField('secret').isActive()).toBe(false); // TODO

    let movie2 = await layer.Movie.$get({id});
    expect(movie2).toBe(movie);
    expect(movie2.title).toBe('Inception');
    expect(movie2.year).toBe(2010);

    let otherLayer = rootLayer.fork();
    movie2 = await otherLayer.Movie.$get({id});
    expect(movie2).not.toBe(movie);

    await expect(layer.Movie.$get({id: 'missing-id'})).rejects.toThrow(/Document not found/);
    expect(await layer.Movie.$get({id: 'missing-id'}, {throwIfNotFound: false})).toBeUndefined();
    expect(await layer.Movie.$has({id: 'missing-id'})).toBe(false);

    // === Partial read ===

    movie = await layer.Movie.$get({id}, {fields: {title: true}});
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('Inception');
    expect(movie.$getField('year').isActive()).toBe(true);
    expect(movie.year).toBe(2010); // Although we didn't fetch the 'year', the instance was in the identity map, and the 'year' is still there

    otherLayer = rootLayer.fork();
    movie = await otherLayer.Movie.$get({id}, {fields: {title: true}});
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('Inception');
    expect(movie.$getField('year').isActive()).toBe(false); // We loaded the movie from another layer, so the 'year' has not been fetched

    movie2 = await otherLayer.Movie.$get({id}, {fields: {year: true}});
    expect(movie2).toBe(movie);
    expect(movie2.title).toBe('Inception'); // The 'title' is still there
    expect(movie.$getField('year').isActive()).toBe(true);
    expect(movie2.year).toBe(2010); // And now we have the 'year'

    otherLayer = rootLayer.fork();
    movie = await otherLayer.Movie.$get({id}, {fields: false}); // Existence check
    expect(movie.id).toBe(id);
    expect(movie.$getField('title').isActive()).toBe(false);
    expect(movie.$getField('year').isActive()).toBe(false);

    // === Get by unique field ===

    layer = rootLayer.fork();
    movie = await layer.Movie.$get(
      {reference: 'movie-001'},
      {fields: {title: true, reference: true}}
    );
    expect(movie.title).toBe('Inception');
    expect(movie.$getField('year').isActive()).toBe(false);
    expect(movie.reference).toBe('movie-001');

    // Let's query a second time to ensure there is no issue with the cache
    layer = rootLayer.fork();
    movie = await layer.Movie.$get(
      {reference: 'movie-001'},
      {fields: {title: true, reference: true}}
    );
    expect(movie.title).toBe('Inception');
    expect(movie.$getField('year').isActive()).toBe(false);
    expect(movie.reference).toBe('movie-001');

    layer = rootLayer.fork();
    await expect(layer.Movie.$get({reference: 'missing-ref'})).rejects.toThrow(
      /Item\(s\) not found/
    );
    expect(
      await layer.Movie.$get({reference: 'missing-ref'}, {throwIfNotFound: false})
    ).toBeUndefined();
    expect(await layer.Movie.$has({reference: 'missing-ref'})).toBe(false);

    layer = rootLayer.fork();
    await expect(layer.Movie.$get({title: 'Inception'})).rejects.toThrow(
      /A key name must correspond to a unique field/
    );

    // === Update ===

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    movie.title = 'The Matrix';
    await movie.$save();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBe(2010);

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    movie.year = undefined;
    await movie.$save();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('The Matrix');
    expect(movie.year).toBeUndefined();

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    movie.title = undefined;
    await expect(movie.$save()).rejects.toThrow(/Model validation failed/);

    // === Delete ===

    layer = rootLayer.fork();
    expect(await layer.Movie.$has({id})).toBe(true);
    movie = await layer.Movie.$get({id});
    await movie.$delete();
    expect(await layer.Movie.$has({id})).toBe(false);
  });

  test.skip('Nesting models', async () => {
    class Movie extends Storable() {
      @field('string') title;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('boolean') color;

      @field('string') aspectRatio;
    }

    const store = new MongoDBStore();
    const rootLayer = new Layer({Movie, TechnicalSpecs, store});

    let layer = rootLayer.fork();
    let movie = new layer.Movie({
      title: 'Inception',
      technicalSpecs: {color: true, aspectRatio: '2.39:1'}
    });
    const id = movie.id;
    await movie.$save();

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(id);
    expect(movie.title).toBe('Inception');
    expect(movie.technicalSpecs instanceof layer.TechnicalSpecs).toBe(true);
    expect(movie.technicalSpecs.color).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id}, {fields: {title: true, technicalSpecs: {color: true}}});
    expect(movie.title).toBe('Inception');
    expect(movie.technicalSpecs.color).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBeUndefined();
    await movie.load({fields: {technicalSpecs: {aspectRatio: true}}});
    expect(movie.title).toBe('Inception');
    expect(movie.technicalSpecs.color).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id});
    await movie.$delete();
    movie = await layer.Movie.$get({id}, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id}, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
  });

  test.skip('Substorables', async () => {
    class Movie extends Storable() {
      @field('string') title;

      @field('Trailer') trailer;
    }

    class Trailer extends Identity {
      @field('string') url;

      @field('number?') duration;
    }

    const store = new MongoDBStore();
    const rootLayer = new Layer({Movie, Trailer, store});

    // Let's create both a 'Movie' and a 'Trailer'
    let layer = rootLayer.fork();
    let movie = new layer.Movie({
      title: 'Inception',
      trailer: {url: 'https://www.youtube.com/watch?v=YoHD9XEInc0', duration: 30}
    });
    const movieId = movie.id;
    expect(typeof movieId === 'string').toBe(true);
    expect(movieId !== '').toBe(true);
    const trailerId = movie.trailer.id;
    expect(typeof trailerId === 'string').toBe(true);
    expect(trailerId !== '').toBe(true);
    await movie.$save();

    // Will fetch both the 'Movie' storable and its 'Trailer' substorable
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer instanceof layer.Trailer).toBe(true);
    expect(movie.trailer.id).toBe(trailerId);
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=YoHD9XEInc0');
    expect(movie.trailer.duration).toBe(30);

    // Will fetch the 'Movie' storable only
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {fields: {title: true}});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer).toBeUndefined();

    // Will fetch the 'Movie' storable and the id of its trailer
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {fields: {title: true, trailer: {}}});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.trailer instanceof layer.Trailer).toBe(true);
    expect(movie.trailer.id).toBe(trailerId);
    expect(movie.trailer.url).toBeUndefined();

    // The trailer can be partially modified
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    movie.trailer.url = 'https://www.youtube.com/watch?v=8hP9D6kZseM';
    await movie.$save();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=8hP9D6kZseM');
    expect(movie.trailer.duration).toBe(30);

    // The trailer can be fully replaced
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    movie.trailer = {url: 'https://www.youtube.com/watch?v=YoHD9XEInc0', duration: 45};
    const newTrailerId = movie.trailer.id;
    expect(typeof newTrailerId === 'string').toBe(true);
    expect(newTrailerId !== '').toBe(true);
    expect(newTrailerId).not.toBe(trailerId); // The trailer got a new id
    await movie.$save();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    expect(movie.trailer.id).toBe(newTrailerId);
    expect(movie.trailer.url).toBe('https://www.youtube.com/watch?v=YoHD9XEInc0');
    expect(movie.trailer.duration).toBe(45);

    // Will delete both the movie storable and its trailer substorable
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    await movie.$delete();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
  });

  test('Finding storables', async () => {
    class Movie extends Storable(undefined, {storeName: 'store'}) {
      @store() @field('string') title;

      @store() @field('string') genre;

      @store() @field('string') country;
    }

    const rootLayer = new Layer({Movie, store: mongoDBStore});
    await rootLayer.open();

    // Create

    let layer = rootLayer.fork();
    const movie1 = new layer.Movie({
      id: 'movie1',
      title: 'Inception',
      genre: 'action',
      country: 'USA'
    });
    await movie1.$save();
    const movie2 = new layer.Movie({
      id: 'movie2',
      title: 'Forrest Gump',
      genre: 'drama',
      country: 'USA'
    });
    await movie2.$save();
    const movie3 = new layer.Movie({
      id: 'movie3',
      title: 'Léon',
      genre: 'action',
      country: 'France'
    });
    await movie3.$save();

    let movies = await layer.Movie.$find();
    expect(movies[0]).toBe(movie1);
    expect(movies[1]).toBe(movie2);
    expect(movies[2]).toBe(movie3);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find();
    expect(movies[0]).not.toBe(movie1);
    expect(movies[1]).not.toBe(movie2);
    expect(movies[2]).not.toBe(movie3);
    expect(movies.map(movie => movie.id)).toEqual(['movie1', 'movie2', 'movie3']);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find({filter: {genre: 'action'}});
    expect(movies.map(movie => movie.id)).toEqual(['movie1', 'movie3']);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find({filter: {genre: 'action', country: 'France'}});
    expect(movies.map(movie => movie.id)).toEqual(['movie3']);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find({filter: {genre: 'adventure'}});
    expect(movies.map(movie => movie.id)).toEqual([]);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find({skip: 1, limit: 1});
    expect(movies.map(movie => movie.id)).toEqual(['movie2']);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find({fields: {title: true}});
    expect(movies.map(movie => movie.$serialize())).toEqual([
      {_type: 'Movie', _id: 'movie1', title: 'Inception'},
      {_type: 'Movie', _id: 'movie2', title: 'Forrest Gump'},
      {_type: 'Movie', _id: 'movie3', title: 'Léon'}
    ]);

    layer = rootLayer.fork();
    movies = await layer.Movie.$find({fields: false});
    await layer.Movie.$delete(movies);
  });

  test.skip('Reloading storables', async () => {
    class Movie extends Storable() {
      @field('string') title;

      @field('number') year;
    }

    const store = new MongoDBStore();
    const rootLayer = new Layer({Movie, store});

    const layer = rootLayer.fork();
    const movie = new layer.Movie({title: 'Inception', year: 2010});
    const id = movie.id;
    await movie.$save();

    const otherLayer = rootLayer.fork();
    const otherMovie = await otherLayer.Movie.$get({id});
    expect(otherMovie).not.toBe(movie);
    expect(otherMovie.title).toBe('Inception');
    expect(otherMovie.year).toBe(2010);

    movie.title = 'The Matrix';
    movie.year = 1999;
    await movie.$save();

    await otherMovie.load();
    expect(otherMovie.title).toBe('Inception'); // The movie has not been reloaded
    expect(otherMovie.year).toBe(2010);

    await otherMovie.reload();
    expect(otherMovie.title).toBe('The Matrix'); // The movie has not been reloaded
    expect(otherMovie.year).toBe(1999);

    await movie.$delete();
  });

  test('Referenced storables', async () => {
    // TODO: Make this test failed when fields are marked as not storable

    class Movie extends Storable(undefined, {storeName: 'mongoDBStore'}) {
      @store() @field('string') title;

      @store() @field('Director') director;
    }

    class Director extends Storable(undefined, {storeName: 'mongoDBStore'}) {
      @store() @field('string') fullName;

      @store() @field('string?') country;
    }

    const rootLayer = new Layer({Movie, Director, mongoDBStore});
    await rootLayer.open();

    let layer = rootLayer.fork();
    let movie = new layer.Movie({
      title: 'Inception',
      director: {fullName: 'Christopher Nolan', country: 'USA'}
    });
    const movieId = movie.id;
    const directorId = movie.director.id;
    await movie.director.$save();
    await movie.$save();

    // The director can be fetched independently
    layer = rootLayer.fork();
    let director = await layer.Director.$get({id: directorId});
    expect(director instanceof layer.Director).toBe(true);
    expect(director.id).toBe(directorId);
    expect(director.fullName).toBe('Christopher Nolan');
    expect(director.country).toBe('USA');

    // Will fetch both the 'Movie' and its director
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director instanceof layer.Director).toBe(true);
    expect(movie.director.id).toBe(directorId);
    expect(movie.director.fullName).toBe('Christopher Nolan');
    expect(movie.director.country).toBe('USA');

    // Will fetch the 'Movie' only
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {fields: {title: true}});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.$getField('director').isActive()).toBe(false);

    // Will fetch the 'Movie' and its director's id
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {fields: {title: true, director: {}}});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director instanceof layer.Director).toBe(true);
    expect(movie.director.id).toBe(directorId);
    expect(movie.director.$getField('fullName').isActive()).toBe(false);
    expect(movie.director.$getField('country').isActive()).toBe(false);

    // Will fetch the 'Movie' and it's director partially
    layer = rootLayer.fork();
    movie = await layer.Movie.$get(
      {id: movieId},
      {fields: {title: true, director: {fullName: true}}}
    );
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director instanceof layer.Director).toBe(true);
    expect(movie.director.id).toBe(directorId);
    expect(movie.director.fullName).toBe('Christopher Nolan');
    expect(movie.director.$getField('country').isActive()).toBe(false);

    // The director can be replaced
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    let newDirector = new layer.Director({fullName: 'C. Nolan'});
    const newDirectorId = newDirector.id;
    expect(newDirectorId).not.toBe(directorId);
    await newDirector.$save();
    movie.director = newDirector;
    await movie.$save();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.director.id).toBe(newDirectorId);
    expect(movie.director.fullName).toBe('C. Nolan');
    expect(movie.director.country).toBe(undefined);

    // Let's delete everything
    layer = rootLayer.fork();
    expect(await layer.Movie.$has({id: movieId})).toBe(true); // The movie is there
    movie = await layer.Movie.$get({id: movieId});
    await movie.$delete();
    expect(await layer.Movie.$has({id: movieId})).toBe(false); // The movie is gone
    newDirector = await layer.Director.$get({id: newDirectorId});
    expect(newDirector.id).toBe(newDirectorId); // But the director is still there
    await newDirector.$delete(); // So let's delete it
    expect(await layer.Director.$has({id: newDirectorId})).toBe(false);
    director = await layer.Director.$get({id: directorId}); // Let's also delete the first director
    await director.$delete();
    expect(await layer.Director.$has({id: directorId})).toBe(false);
  });

  test.skip('Arrays of referenced storable', async () => {
    class Movie extends Storable() {
      @field('string') title;

      @field('Actor[]') actors;
    }

    class Actor extends Storable() {
      @field('string') fullName;
    }

    const store = new MongoDBStore();
    const rootLayer = new Layer({Movie, Actor, store});

    // Let's create both a 'Movie' and some 'Actor'
    let layer = rootLayer.fork();
    let movie = new layer.Movie({
      title: 'Inception',
      actors: [{fullName: 'Leonardo DiCaprio'}, {fullName: 'Joseph Gordon-Levitt'}]
    });
    const movieId = movie.id;
    const actorIds = movie.actors.map(actor => actor.id);
    for (const actor of movie.actors) {
      await actor.$save();
    }
    await movie.$save();

    // The actors can be fetched directly from the 'Actor' collection
    layer = rootLayer.fork();
    let actor = await layer.Actor.$get({id: actorIds[0]});
    expect(actor instanceof layer.Actor).toBe(true);
    expect(actor.id).toBe(actorIds[0]);
    expect(actor.fullName).toBe('Leonardo DiCaprio');
    actor = await layer.Actor.$get({id: actorIds[1]});
    expect(actor instanceof layer.Actor).toBe(true);
    expect(actor.id).toBe(actorIds[1]);
    expect(actor.fullName).toBe('Joseph Gordon-Levitt');

    // Will fetch both 'Movie' and 'Actor' storables
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.actors).toHaveLength(2);
    expect(movie.actors[0] instanceof layer.Actor).toBe(true);
    expect(movie.actors[0].id).toBe(actorIds[0]);
    expect(movie.actors[0].fullName).toBe('Leonardo DiCaprio');
    expect(movie.actors[1] instanceof layer.Actor).toBe(true);
    expect(movie.actors[1].id).toBe(actorIds[1]);
    expect(movie.actors[1].fullName).toBe('Joseph Gordon-Levitt');

    // Will fetch 'Movie' storable only
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {fields: {title: true}});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.actors).toHaveLength(0);

    // Will fetch 'Movie' storable and the ids of the actors
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {fields: {title: true, actors: [{}]}});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.id).toBe(movieId);
    expect(movie.title).toBe('Inception');
    expect(movie.actors[0] instanceof layer.Actor).toBe(true);
    expect(movie.actors[0].id).toBe(actorIds[0]);
    expect(movie.actors[0].fullName).toBeUndefined();
    expect(movie.actors[1] instanceof layer.Actor).toBe(true);
    expect(movie.actors[1].id).toBe(actorIds[1]);
    expect(movie.actors[1].fullName).toBeUndefined();

    // An actor can be modified through its parent movie
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    movie.actors[0].fullName = 'L. DiCaprio';
    await movie.actors[0].$save();
    layer = rootLayer.fork();
    actor = await layer.Actor.$get({id: actorIds[0]});
    expect(actor.fullName).toBe('L. DiCaprio');

    // Let's delete the movie and its actors
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
    for (const actor of movie.actors) {
      await actor.$delete();
    }
    await movie.$delete();
    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId}, {throwIfNotFound: false});
    expect(movie).toBeUndefined();
    actor = await layer.Actor.$get({id: actorIds[0]}, {throwIfNotFound: false});
    expect(actor).toBeUndefined();
    actor = await layer.Actor.$get({id: actorIds[1]}, {throwIfNotFound: false});
    expect(actor).toBeUndefined();
  });

  test.skip('Hooks', async () => {
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

    class Movie extends HookMixin(Storable()) {
      @field('string') title;

      @field('Trailer') trailer;
    }

    class Trailer extends HookMixin(Identity) {
      @field('string') url;
    }

    const store = new MongoDBStore();
    const rootLayer = new Layer({Movie, Trailer, store});

    let layer = rootLayer.fork();
    let movie = new layer.Movie({
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

    await movie.$save();
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

    layer = rootLayer.fork();
    movie = await layer.Movie.$get({id: movieId});
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

    movie = await layer.Movie.$get({id: movieId});
    expect(movie.afterLoadCount).toBe(1); // Since the movie was in the entity map, 'afterLoad' has not been called a second time
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
    await movie.$save();
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

    await movie.$delete();
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
