import {Layer, Registerable, Serializable} from '../../..';

describe('Layer', () => {
  test('Registration', () => {
    class Item extends Registerable() {}

    class Movie extends Item {
      constructor({title} = {}) {
        super();
        this.title = title;
      }
    }

    expect(Movie.hasLayer()).toBe(false);

    const layer = new Layer({Item, Movie}, {name: 'layer'});
    expect(layer.getId().length).toBeGreaterThanOrEqual(10);
    expect(layer.getName()).toBe('layer');

    expect(layer.Movie).not.toBe(Movie);
    expect(Movie.getLayer({throwIfNotFound: false})).toBeUndefined();
    expect(Movie.hasLayer()).toBe(false);
    expect(Movie.getRegisteredName()).toBeUndefined();
    expect(layer.Movie.getLayer()).toBe(layer);
    expect(layer.Movie.hasLayer()).toBe(true);
    expect(layer.Movie.getRegisteredName()).toBe('Movie');

    expect([...layer.getItems()]).toEqual([layer.Item, layer.Movie]);

    const movie = new layer.Movie({title: 'Inception'});

    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie instanceof layer.Item).toBe(true);
    expect(movie.getLayer()).toBe(layer);
    expect(movie.hasLayer()).toBe(true);
    expect(movie.getLayer({fallBackToClass: false, throwIfNotFound: false})).toBeUndefined();
    expect(movie.hasLayer({fallBackToClass: false})).toBe(false);

    layer.register({movie});

    expect(layer.movie.title).toBe('Inception');
    expect(layer.movie).not.toBe(movie);
    expect(layer.movie instanceof layer.Movie).toBe(true);
    expect(layer.movie instanceof layer.Item).toBe(true);
    expect(layer.movie.getRegisteredName()).toBe('movie');

    const movie2 = new layer.Movie({title: 'The Matrix'});

    expect(() => {
      layer.register({movie: movie2}); // Cannot register an item with a name that already exists
    }).toThrow(/Name already registered/);

    expect(() => {
      layer.movie = movie2; // Cannot modify a registered item
    }).toThrow();

    const anotherLayer = new Layer({Item, Movie}, {name: 'anotherLayer'});
    expect(anotherLayer.getId().length).toBeGreaterThanOrEqual(10);
    expect(anotherLayer.getId()).not.toBe(layer.getId());
    expect(anotherLayer.getName()).toBe('anotherLayer');

    expect(() => {
      anotherLayer.register({movie: layer.movie}); // Cannot register an already registered item
    }).toThrow(/Registerable already registered/);
  });

  test('Forking', () => {
    class Store extends Registerable() {}

    const layer = new Layer({Store});

    const store = new layer.Store();

    layer.register({store});

    const sublayer = layer.fork();

    expect(sublayer.store instanceof layer.Store).toBe(true);

    sublayer.store.transaction = 12345;
    expect(sublayer.store.transaction).toBe(12345);
    expect(layer.store.transaction).toBeUndefined();
  });

  test('Serialization', () => {
    class Movie extends Serializable(Registerable()) {
      constructor({title, ...object} = {}, {isDeserializing} = {}) {
        super(object, {isDeserializing});
        if (!isDeserializing) {
          this.title = title;
        }
      }

      serialize() {
        return {
          ...super.serialize(),
          title: this.title
        };
      }

      deserialize({title, ...object} = {}) {
        super.deserialize(object);
        this.title = title;
      }
    }

    const layer = new Layer({Movie});

    let movie = new layer.Movie({title: 'Inception'});
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.serialize()).toEqual({_type: 'Movie', _new: true, title: 'Inception'});

    movie = layer.deserialize({_type: 'Movie', _new: true, title: 'Inception'});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.serialize()).toEqual({_type: 'Movie', _new: true, title: 'Inception'});

    movie = layer.deserialize({_type: 'Movie', title: 'The Matrix'});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('The Matrix');
    expect(movie.serialize()).toEqual({_type: 'Movie', title: 'The Matrix'});

    movie = layer.deserialize({_type: 'Movie'});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBeUndefined();
    expect(movie.serialize()).toEqual({_type: 'Movie'});

    movie = layer.deserialize({_type: 'Movie', title: 'Forest Gump'});
    const serialized = layer.serialize({
      id: 123,
      date: new Date(Date.UTC(2019, 4, 5)),
      payload: {movies: [movie.serialize()]}
    });
    expect(serialized).toEqual({
      id: 123,
      date: {_type: 'Date', _value: '2019-05-05T00:00:00.000Z'},
      payload: {movies: [{_type: 'Movie', title: 'Forest Gump'}]}
    });

    const deserialized = layer.deserialize({
      id: 123,
      date: {_type: 'Date', _value: '2019-05-05T00:00:00.000Z'},
      payload: {movies: [{_type: 'Movie', title: 'Forest Gump'}]}
    });
    expect(deserialized.id).toBe(123);
    expect(deserialized.date instanceof Date).toBe(true);
    expect(deserialized.date.toISOString()).toBe('2019-05-05T00:00:00.000Z');
    movie = deserialized.payload.movies[0];
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.title).toBe('Forest Gump');
  });
});
