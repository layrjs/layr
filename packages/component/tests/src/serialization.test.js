import {Component, serialize, attribute} from '../../..';

describe('Serialization', () => {
  test('Component classes', async () => {
    class BaseMovie extends Component {}

    expect(BaseMovie.serialize()).toEqual({__component: 'BaseMovie'});

    class Movie extends BaseMovie {
      @attribute() static limit = 100;
      @attribute() static offset;
    }

    expect(Movie.serialize()).toEqual({
      __component: 'Movie',
      limit: 100,
      offset: {__undefined: true}
    });
    expect(Movie.serialize({attributeSelector: {limit: true}})).toEqual({
      __component: 'Movie',
      limit: 100
    });

    class Cinema extends Component {
      @attribute() static MovieClass = Movie;
    }

    expect(Cinema.serialize()).toEqual({
      __component: 'Cinema',
      MovieClass: {__component: 'Movie', limit: 100, offset: {__undefined: true}}
    });
    expect(Cinema.serialize({attributeSelector: {MovieClass: {limit: true}}})).toEqual({
      __component: 'Cinema',
      MovieClass: {__component: 'Movie', limit: 100}
    });
  });

  test('Component instances', async () => {
    class Movie extends Component {
      @attribute() title = '';
      @attribute() director;
    }

    let movie = new Movie();

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      __new: true,
      title: '',
      director: {__undefined: true}
    });
    expect(movie.serialize({attributeSelector: {title: true}})).toEqual({
      __component: 'movie',
      __new: true,
      title: ''
    });

    movie = Object.create(Movie.prototype);

    expect(movie.serialize()).toEqual({
      __component: 'movie'
    });

    movie.title = 'Inception';

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      title: 'Inception'
    });

    class Director extends Component {
      @attribute() name;
      @attribute() country;
    }

    movie.director = new Director();
    movie.director.name = 'Christopher Nolan';

    expect(movie.serialize()).toEqual({
      __component: 'movie',
      title: 'Inception',
      director: {
        __component: 'director',
        __new: true,
        name: 'Christopher Nolan',
        country: {__undefined: true}
      }
    });
    expect(movie.serialize({attributeSelector: {title: true, director: {name: true}}})).toEqual({
      __component: 'movie',
      title: 'Inception',
      director: {__component: 'director', __new: true, name: 'Christopher Nolan'}
    });
    expect(movie.serialize({attributeSelector: {title: true, director: {}}})).toEqual({
      __component: 'movie',
      title: 'Inception',
      director: {__component: 'director', __new: true}
    });

    expect(
      movie.serialize({
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
      await movie.serialize({
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
