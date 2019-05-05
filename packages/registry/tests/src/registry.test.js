import {Registry, Registerable, Serializable} from '../../..';

describe('Registry', () => {
  test('Registration', () => {
    class Item extends Registerable() {}

    class Movie extends Item {
      constructor({title} = {}) {
        super();
        this.title = title;
      }
    }

    const registry = new Registry('registry', {register: {Item, Movie}});
    expect(registry.getName()).toBe('registry');

    expect(registry.Movie).not.toBe(Movie);
    expect(Movie.getRegistry({throwIfNotFound: false})).toBeUndefined();
    expect(Movie.getRegisteredName()).toBeUndefined();
    expect(registry.Movie.getRegistry()).toBe(registry);
    expect(registry.Movie.getRegisteredName()).toBe('Movie');

    const movie = new registry.Movie({title: 'Inception'});

    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie instanceof registry.Item).toBe(true);
    expect(movie.constructor.getRegistry()).toBe(registry);

    registry.register({movie});

    expect(registry.movie.title).toBe('Inception');
    expect(registry.movie).not.toBe(movie);
    expect(registry.movie instanceof registry.Movie).toBe(true);
    expect(registry.movie instanceof registry.Item).toBe(true);
    expect(registry.movie.getRegisteredName()).toBe('movie');

    const movie2 = new registry.Movie({title: 'The Matrix'});

    expect(() => {
      registry.register({movie: movie2}); // Cannot register an item with a name that already exists
    }).toThrow(/Name already registered/);

    expect(() => {
      registry.movie = movie2; // Cannot modify a registered item
    }).toThrow();

    const anotherRegistry = new Registry('anotherRegistry', {register: {Item, Movie}});
    expect(anotherRegistry.getName()).toBe('anotherRegistry');

    expect(() => {
      anotherRegistry.register({movie: registry.movie}); // Cannot register an already registered item
    }).toThrow(/Registerable already registered/);
  });

  test('Forking', () => {
    class Store extends Registerable() {}

    const registry = new Registry('registry', {register: {Store}});

    const store = new registry.Store();

    registry.register({store});

    const subregistry = registry.fork();

    expect(subregistry.store instanceof registry.Store).toBe(true);

    subregistry.store.transaction = 12345;
    expect(subregistry.store.transaction).toBe(12345);
    expect(registry.store.transaction).toBeUndefined();
  });

  test('Serialization', () => {
    class Movie extends Serializable(Registerable()) {
      initialize({title, ...object} = {}, options) {
        super.initialize(object, options);
        this.title = title;
      }

      serialize(options) {
        return {
          ...super.serialize(options),
          title: this.title
        };
      }
    }

    const registry = new Registry('registry', {register: {Movie}});

    let movie = new registry.Movie({title: 'Inception'});
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.serialize()).toEqual({_type: 'Movie', _new: true, title: 'Inception'});

    movie = registry.deserialize({_type: 'Movie', _new: true, title: 'Inception'});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.serialize()).toEqual({_type: 'Movie', _new: true, title: 'Inception'});

    movie = registry.deserialize({_type: 'Movie', title: 'The Matrix'});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('The Matrix');
    expect(movie.serialize()).toEqual({_type: 'Movie', title: 'The Matrix'});

    movie = registry.deserialize({_type: 'Movie'});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBeUndefined();
    expect(movie.serialize()).toEqual({_type: 'Movie'});

    movie = registry.deserialize({_type: 'Movie', title: 'Forest Gump'});
    const serialized = registry.serialize({
      id: 123,
      date: new Date(Date.UTC(2019, 4, 5)),
      payload: {movies: [movie.serialize()]}
    });
    expect(serialized).toEqual({
      id: 123,
      date: {_type: 'Date', _value: '2019-05-05T00:00:00.000Z'},
      payload: {movies: [{_type: 'Movie', title: 'Forest Gump'}]}
    });

    const deserialized = registry.deserialize({
      id: 123,
      date: {_type: 'Date', _value: '2019-05-05T00:00:00.000Z'},
      payload: {movies: [{_type: 'Movie', title: 'Forest Gump'}]}
    });
    expect(deserialized.id).toBe(123);
    expect(deserialized.date instanceof Date).toBe(true);
    expect(deserialized.date.toISOString()).toBe('2019-05-05T00:00:00.000Z');
    movie = deserialized.payload.movies[0];
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.title).toBe('Forest Gump');
  });
});
