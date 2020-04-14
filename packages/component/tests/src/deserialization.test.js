import {Component, deserialize, attribute} from '../../..';

describe('Deserialization', () => {
  test('Component classes', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @attribute() static offset;
    }

    expect(Movie.limit).toBe(100);
    expect(Movie.offset).toBeUndefined();

    // --- Using the deserialize() function ---

    const componentGetter = function(name) {
      if (name === 'Movie') {
        return Movie;
      }

      throw new Error('Component not found');
    };

    let DeserializedMovie = deserialize(
      {
        __component: 'Movie',
        limit: {__undefined: true},
        offset: 30
      },
      {componentGetter}
    );

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBeUndefined();
    expect(Movie.offset).toBe(30);

    DeserializedMovie = deserialize(
      {__component: 'Movie', limit: 1000, offset: {__undefined: true}},
      {componentGetter}
    );

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBe(1000);
    expect(Movie.offset).toBeUndefined();

    DeserializedMovie = deserialize({__component: 'Movie'}, {componentGetter});

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBe(1000);
    expect(Movie.offset).toBeUndefined();

    expect(() => deserialize({__component: 'Film'}, {componentGetter})).toThrow(
      'Component not found'
    );

    expect(() => deserialize({__component: 'Movie'})).toThrow(
      "Cannot deserialize a component without a 'componentGetter'"
    );

    // --- Using Component.deserialize() method ---

    DeserializedMovie = Movie.deserialize({limit: {__undefined: true}, offset: 100});

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBeUndefined();
    expect(Movie.offset).toBe(100);

    expect(() => Movie.deserialize({__component: 'Film'})).toThrow(
      "An unexpected component name was encountered while deserializing an object (encountered name: 'Film', expected name: 'Movie')"
    );
  });

  test('Component instances', async () => {
    class Movie extends Component {
      @attribute() title;
      @attribute() duration = 0;
    }

    // --- Using the deserialize() function ---

    let componentGetter = function(name) {
      if (name === 'movie') {
        return Movie.prototype;
      }

      throw new Error('Component not found');
    };

    let movie = deserialize({__component: 'movie', title: 'Inception'}, {componentGetter});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie = deserialize({__component: 'movie', __new: true, title: 'Inception'}, {componentGetter});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(0);

    movie = deserialize(
      {__component: 'movie', __new: true, duration: {__undefined: true}},
      {componentGetter}
    );

    expect(movie.title).toBeUndefined();
    expect(movie.duration).toBeUndefined();

    movie = deserialize(
      {__component: 'movie', __new: true, title: 'Inception', duration: 120},
      {
        componentGetter,
        attributeFilter(attribute) {
          expect(this).toBeInstanceOf(Movie);
          expect(attribute.getParent()).toBe(this);
          return attribute.getName() === 'title';
        }
      }
    );

    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    expect(() => deserialize({__component: 'film'}, {componentGetter})).toThrow(
      'Component not found'
    );

    // --- Using Component.deserializeInstance() method ---

    movie = Movie.deserializeInstance({__component: 'movie', title: 'Inception'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie = Movie.deserializeInstance({__new: true, title: 'Inception'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(0);

    expect(() => Movie.deserializeInstance({__component: 'film'})).toThrow(
      "An unexpected component name was encountered while deserializing an object (encountered name: 'film', expected name: 'movie')"
    );

    // --- Using component.deserialize() method ---

    movie = Movie.instantiate({}, {isNew: true});

    expect(movie.isNew()).toBe(true);
    expect(movie.getAttribute('title').isSet()).toBe(false);
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    const deserializedMovie = movie.deserialize({__new: true, title: 'Inception'});

    expect(deserializedMovie).toBe(movie);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie.deserialize({__new: true, duration: 120});

    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(120);

    movie.deserialize({});

    expect(movie).toBe(movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(120);

    expect(() => movie.deserialize({__component: 'film'})).toThrow(
      "An unexpected component name was encountered while deserializing an object (encountered name: 'film', expected name: 'movie')"
    );

    expect(() => movie.deserialize({__new: true})).toThrow(
      "Cannot mark as new an existing non-new component (component name: 'movie')"
    );

    // --- With a nested component ---

    class Trailer extends Component {
      @attribute() url;
      @attribute() movie;
    }

    componentGetter = function(name) {
      if (name === 'trailer') {
        return Trailer.prototype;
      }

      throw new Error('Component not found');
    };

    expect(() =>
      deserialize(
        {
          __component: 'trailer',
          url: 'https://trailer.com/abc123',
          movie: {__component: 'movie', title: 'The Matrix'}
        },
        {componentGetter}
      )
    ).toThrow(
      "Cannot get the component class 'Movie' from the current component (component name: 'Trailer')"
    );

    Trailer.registerRelatedComponent(Movie);

    const trailer = deserialize(
      {
        __component: 'trailer',
        url: 'https://trailer.com/abc123',
        movie: {__component: 'movie', title: 'The Matrix'}
      },
      {componentGetter}
    );

    expect(trailer).toBeInstanceOf(Trailer);
    expect(trailer.url).toBe('https://trailer.com/abc123');

    movie = trailer.movie;

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.title).toBe('The Matrix');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    trailer.deserialize({
      url: 'https://trailer.com/xyz456',
      movie: {__component: 'movie', duration: 120}
    });

    expect(trailer.url).toBe('https://trailer.com/xyz456');

    // Nested component identities should be preserved
    expect(trailer.movie).toBe(movie);

    expect(movie.title).toBe('The Matrix');
    expect(movie.duration).toBe(120);

    // --- With an array of nested components ---

    class Cinema extends Component {
      @attribute() name;
      @attribute() movies;
    }

    componentGetter = function(name) {
      if (name === 'cinema') {
        return Cinema.prototype;
      }

      throw new Error('Component not found');
    };

    Cinema.registerRelatedComponent(Movie);

    const cinema = deserialize(
      {
        __component: 'cinema',
        name: 'Paradiso',
        movies: [{__component: 'movie', title: 'The Matrix'}]
      },
      {componentGetter}
    );

    expect(cinema).toBeInstanceOf(Cinema);
    expect(cinema.name).toBe('Paradiso');
    expect(cinema.movies).toHaveLength(1);

    movie = cinema.movies[0];

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.title).toBe('The Matrix');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    cinema.deserialize({
      __component: 'cinema',
      name: 'New Paradiso',
      movies: [{__component: 'movie', title: 'The Matrix 2', duration: 120}]
    });

    expect(cinema.name).toBe('New Paradiso');
    expect(cinema.movies).toHaveLength(1);

    const otherMovie = cinema.movies[0];

    // For nested components in arrays, the identity is not (currently) be preserved
    expect(otherMovie).not.toBe(movie);

    expect(otherMovie).toBeInstanceOf(Movie);
    expect(otherMovie.title).toBe('The Matrix 2');
    expect(otherMovie.duration).toBe(120);
  });

  test('Functions', async () => {
    let serializedFunction = {
      __function: 'function sum(a, b) { return a + b; }'
    };

    let func = deserialize(serializedFunction);

    expect(typeof func).toBe('object');
    expect(func).toEqual(serializedFunction);

    func = deserialize(serializedFunction, {deserializeFunctions: true});

    expect(typeof func).toBe('function');
    expect(Object.keys(func)).toEqual([]);
    expect(func.name).toBe('sum');
    expect(func(1, 2)).toBe(3);

    serializedFunction.displayName = 'sum';

    func = deserialize(serializedFunction);

    expect(typeof func).toBe('object');
    expect(func).toEqual(serializedFunction);

    func = deserialize(serializedFunction, {deserializeFunctions: true});

    expect(typeof func).toBe('function');
    expect(func.name).toBe('sum');
    expect(Object.keys(func)).toEqual(['displayName']);
    expect(func.displayName).toBe('sum');
    expect(func(1, 2)).toBe(3);

    serializedFunction = {
      __function: 'function sum() { return a + b; }',
      __context: {a: 1, b: 2}
    };

    func = deserialize(serializedFunction, {deserializeFunctions: true});

    expect(typeof func).toBe('function');
    expect(func.name).toBe('sum');
    expect(Object.keys(func)).toEqual(['__context']);
    expect(func.__context).toEqual({a: 1, b: 2});
    expect(func(1, 2)).toBe(3);
  });
});
