import {Component, attribute} from '../../..';

describe('Forking', () => {
  test('Simple component', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;

      @attribute() title;
      @attribute() tags;
      @attribute() specs;
    }

    const ForkedMovie = Movie.fork();

    expect(ForkedMovie.getComponentName()).toBe('Movie');
    expect(ForkedMovie.limit).toBe(100);

    expect(ForkedMovie.isForkOf(Movie)).toBe(true);
    expect(ForkedMovie.isForkOf(ForkedMovie)).toBe(false);
    expect(Movie.isForkOf(ForkedMovie)).toBe(false);

    ForkedMovie.limit = 500;

    expect(ForkedMovie.limit).toBe(500);
    expect(Movie.limit).toBe(100);

    const movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    expect(movie).toBeInstanceOf(Component);
    expect(movie).toBeInstanceOf(Movie);

    const forkedMovie = movie.fork();

    expect(forkedMovie).toBeInstanceOf(Component);
    expect(forkedMovie).toBeInstanceOf(Movie);

    expect(forkedMovie.getComponentName()).toBe('movie');
    expect(forkedMovie.title).toBe('Inception');
    expect(forkedMovie.tags).toEqual(['drama']);
    expect(forkedMovie.specs).toEqual({duration: 120});

    expect(forkedMovie.isForkOf(movie)).toBe(true);
    expect(forkedMovie.isForkOf(forkedMovie)).toBe(false);
    expect(movie.isForkOf(forkedMovie)).toBe(false);

    forkedMovie.title = 'Inception 2';
    forkedMovie.tags.push('action');
    forkedMovie.specs.duration = 125;

    expect(forkedMovie.title).toBe('Inception 2');
    expect(forkedMovie.tags).toEqual(['drama', 'action']);
    expect(forkedMovie.specs).toEqual({duration: 125});
    expect(movie.title).toBe('Inception');
    expect(movie.tags).toEqual(['drama']);
    expect(movie.specs).toEqual({duration: 120});

    const forkedIntoMovie = movie.forkInto(ForkedMovie);

    expect(forkedIntoMovie).toBeInstanceOf(Component);
    expect(forkedIntoMovie).toBeInstanceOf(Movie);
    expect(forkedIntoMovie).toBeInstanceOf(ForkedMovie);
  });

  test('Nested component', async () => {
    class Movie extends Component {
      @attribute() director;
    }

    class Director extends Component {
      @attribute() name;
    }

    Movie.registerRelatedComponent(Director);

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const forkedMovie = movie.fork();

    expect(forkedMovie.director.constructor).toBe(Director);
    expect(forkedMovie.director).not.toBe(movie.director);
    expect(forkedMovie.director.name).toBe('Christopher Nolan');

    forkedMovie.director.name = 'Christopher Nolan 2';

    expect(forkedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });
});
