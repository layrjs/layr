import {Layer, Registerable, Serializable} from '../../..';

describe('Layer', () => {
  test('Basic usage', async () => {
    class Item extends Registerable() {}

    class Movie extends Item {
      constructor({title} = {}) {
        super();
        this.title = title;
      }
    }

    expect(Movie.$hasLayer()).toBe(false);

    const layer = new Layer({Item, Movie}, {name: 'layer'});

    expect(layer.getName()).toBe('layer');
    expect(Movie.$getLayer()).toBe(layer);
    expect(Movie.$hasLayer()).toBe(true);
    expect(Movie.$getRegisteredName()).toBe('Movie');

    expect(() => layer.Movie).toThrow(/Cannot get an item from a closed layer/);

    await layer.open();

    expect(layer.Movie).toBe(Movie);
    expect([...layer.getItems()]).toEqual([Item, Movie]);

    const movie = new layer.Movie({title: 'Inception'});

    expect(movie instanceof Movie).toBe(true);
    expect(movie instanceof Item).toBe(true);
    expect(movie.$getLayer()).toBe(layer);
    expect(movie.$hasLayer()).toBe(true);
    expect(movie.$getLayer({fallBackToClass: false, throwIfNotFound: false})).toBeUndefined();
    expect(movie.$hasLayer({fallBackToClass: false})).toBe(false);

    await layer.close();

    layer.register({movie});
    expect(movie.$getRegisteredName()).toBe('movie');

    await layer.open();
    expect(layer.movie).toBe(movie);
    await layer.close();

    const movie2 = new Movie({title: 'The Matrix'});

    expect(() => {
      layer.register({movie: movie2}); // Cannot register an item with a name that already exists
    }).toThrow(/Name already registered/);

    expect(() => {
      layer.movie = movie2; // Cannot modify a registered item
    }).toThrow();

    expect(() => {
      return new Layer({Movie}); // Cannot register an already registered item into another layer
    }).toThrow(/Registerable already registered/);

    class Trailer extends Item {}

    const anotherLayer = new Layer({Trailer}, {name: 'anotherLayer'});
    expect(anotherLayer.getName()).toBe('anotherLayer');
  });

  test('Forking', async () => {
    class Store extends Serializable(Registerable()) {}

    const store = new Store();

    const layer = new Layer({store});
    await layer.open();

    const sublayer = layer.fork();

    sublayer.store.transaction = 12345;
    expect(sublayer.store.transaction).toBe(12345);
    expect(layer.store.transaction).toBeUndefined();
  });

  test('Serialization', async () => {
    class Movie extends Serializable(Registerable()) {
      constructor({title, ...object} = {}) {
        super(object);
        this.title = title;
      }

      $serialize() {
        return {
          ...super.$serialize(),
          title: this.title
        };
      }

      $deserialize({title, ...object} = {}) {
        super.$deserialize(object);
        this.title = title;
      }
    }

    const layer = new Layer({Movie});
    await layer.open();

    let movie = new layer.Movie({title: 'Inception'});
    expect(movie.$isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.$serialize()).toEqual({_type: 'Movie', _new: true, title: 'Inception'});

    movie = layer.deserialize({_type: 'Movie', _new: true, title: 'Inception'});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.$isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.$serialize()).toEqual({_type: 'Movie', _new: true, title: 'Inception'});

    movie = layer.deserialize({_type: 'Movie', title: 'The Matrix'});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.$isNew()).toBe(false);
    expect(movie.title).toBe('The Matrix');
    expect(movie.$serialize()).toEqual({_type: 'Movie', title: 'The Matrix'});

    movie = layer.deserialize({_type: 'Movie'});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.$isNew()).toBe(false);
    expect(movie.title).toBeUndefined();
    expect(movie.$serialize()).toEqual({_type: 'Movie'});

    movie = layer.deserialize({_type: 'Movie', title: 'Forest Gump'});
    const serialized = layer.serialize({
      id: 123,
      date: new Date(Date.UTC(2019, 4, 5)),
      payload: {movies: [movie.$serialize()]}
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
