import {Component, deserialize, attribute} from '../../..';

describe('Deserialization', () => {
  test('Component classes', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @attribute() static offset;
    }

    expect(Movie.limit).toBe(100);
    expect(Movie.offset).toBeUndefined();

    let DeserializedMovie = Movie.deserialize({
      __component: 'Movie',
      limit: {__undefined: true},
      offset: 30
    });

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBeUndefined();
    expect(Movie.offset).toBe(30);

    DeserializedMovie = Movie.deserialize({
      limit: 1000,
      offset: {__undefined: true}
    });

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBe(1000);
    expect(Movie.offset).toBeUndefined();

    DeserializedMovie = Movie.deserialize();

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBe(1000);
    expect(Movie.offset).toBeUndefined();

    expect(() => Movie.deserialize({__component: 'Film'})).toThrow(
      "An unexpected component name was encountered while deserializing an object (encountered name: 'Film', expected name: 'Movie')"
    );
  });

  test('Component instances', async () => {
    class Movie extends Component {
      @attribute() title;
      @attribute() duration = 0;
    }

    const movie = Movie.deserialize({__component: 'movie', title: 'Inception'});

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    const movie2 = Movie.deserialize({__component: 'movie', __new: true, title: 'Inception'});

    expect(movie2).toBeInstanceOf(Movie);
    expect(movie2).not.toBe(Movie.prototype);
    expect(movie2.isNew()).toBe(true);
    expect(movie2.title).toBe('Inception');
    expect(movie2.duration).toBe(0);

    const movie3 = Movie.prototype.deserialize({__new: true, title: 'Inception', duration: 120});

    expect(movie3.title).toBe('Inception');
    expect(movie3.duration).toBe(120);

    const movie4 = Movie.prototype.deserialize({__new: true, duration: {__undefined: true}});

    expect(movie4.title).toBeUndefined();
    expect(movie4.duration).toBeUndefined();

    const movie5 = Movie.prototype.deserialize(
      {__new: true, title: 'Inception', duration: 120},
      {
        attributeFilter(attribute) {
          expect(this).toBeInstanceOf(Movie);
          expect(attribute.getParent()).toBe(this);
          return attribute.getName() === 'title';
        }
      }
    );

    expect(movie5.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    class Cinema extends Component {
      @attribute() movies;
    }

    expect(() =>
      Cinema.prototype.deserialize({movies: [{__component: 'movie', title: 'The Matrix'}]})
    ).toThrow("Cannot get the related component class 'Movie' (component name: 'Cinema')");

    Cinema.registerRelatedComponent(Movie);

    const cinema = Cinema.prototype.deserialize({
      movies: [{__component: 'movie', title: 'The Matrix'}]
    });

    expect(cinema).toBeInstanceOf(Cinema);
    expect(cinema.movies).toHaveLength(1);
    expect(cinema.movies[0]).toBeInstanceOf(Movie);
    expect(cinema.movies[0].title).toBe('The Matrix');
    expect(cinema.movies[0].getAttribute('duration').isSet()).toBe(false);
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
