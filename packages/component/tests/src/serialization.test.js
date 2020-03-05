import {Component, serialize, attribute} from '../../..';

describe('Serialization', () => {
  test('Component classes', async () => {
    class BaseMovie extends Component() {}

    expect(serialize(BaseMovie, {knownComponents: [BaseMovie]})).toEqual({
      __component: 'BaseMovie'
    });

    class Movie extends BaseMovie {
      @attribute() static limit = 100;
      @attribute() static offset;
    }

    expect(serialize(Movie, {knownComponents: [Movie]})).toEqual({
      __component: 'Movie',
      limit: 100,
      offset: {__undefined: true}
    });

    class Cinema extends Component() {
      @attribute() static MovieClass = Movie;
    }

    expect(() => serialize(Cinema, {knownComponents: [Cinema]})).toThrow(
      "The 'Movie' component is unknown"
    );

    expect(serialize(Cinema, {knownComponents: [Cinema, Movie]})).toEqual({
      __component: 'Cinema',
      MovieClass: {__component: 'Movie', limit: 100, offset: {__undefined: true}}
    });
  });

  test('Component instances', async () => {
    class Movie extends Component() {
      @attribute() title = '';
      @attribute() director;
    }

    let movie = new Movie();

    expect(serialize(movie, {knownComponents: [Movie]})).toEqual({
      __component: 'movie',
      __new: true,
      title: '',
      director: {__undefined: true}
    });

    movie = Object.create(Movie.prototype);

    expect(serialize(movie, {knownComponents: [Movie]})).toEqual({
      __component: 'movie'
    });

    movie.title = 'Inception';

    expect(serialize(movie, {knownComponents: [Movie]})).toEqual({
      __component: 'movie',
      title: 'Inception'
    });

    class Director extends Component() {
      @attribute() name;
    }

    movie.director = new Director();
    movie.director.name = 'Christopher Nolan';

    expect(serialize(movie, {knownComponents: [Movie, Director]})).toEqual({
      __component: 'movie',
      title: 'Inception',
      director: {__component: 'director', __new: true, name: 'Christopher Nolan'}
    });

    expect(
      serialize(movie, {
        knownComponents: [Movie],
        attributeFilter(attribute) {
          expect(this).toBe(movie);
          expect(attribute.getParent()).toBe(movie);
          return attribute.getName() === 'title';
        }
      })
    ).toEqual({
      __component: 'movie',
      title: 'Inception'
    });

    expect(
      await serialize(movie, {
        knownComponents: [Movie],
        async attributeFilter(attribute) {
          expect(this).toBe(movie);
          expect(attribute.getParent()).toBe(movie);
          return attribute.getName() === 'title';
        }
      })
    ).toEqual({
      __component: 'movie',
      title: 'Inception'
    });
  });

  test('Functions', async () => {
    function sum(a, b) {
      return a + b;
    }

    expect(serialize(sum)).toEqual({});
    expect(serialize(sum, {serializeFunctions: true})).toEqual({
      __function: 'function sum(a, b) {\n      return a + b;\n    }'
    });

    sum.displayName = 'sum';

    expect(serialize(sum)).toEqual({displayName: 'sum'});
    expect(serialize(sum, {serializeFunctions: true})).toEqual({
      __function: 'function sum(a, b) {\n      return a + b;\n    }',
      displayName: 'sum'
    });

    sum.__context = {x: 1, y: 2};

    expect(serialize(sum)).toEqual({displayName: 'sum', __context: {x: 1, y: 2}});
    expect(serialize(sum, {serializeFunctions: true})).toEqual({
      __function: 'function sum(a, b) {\n      return a + b;\n    }',
      displayName: 'sum',
      __context: {x: 1, y: 2}
    });
  });
});
