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

    ForkedMovie.limit = 500;

    expect(ForkedMovie.limit).toBe(500);
    expect(Movie.limit).toBe(100);

    const movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    const forkedMovie = movie.fork();

    expect(forkedMovie.getComponentName()).toBe('movie');
    expect(forkedMovie.title).toBe('Inception');
    expect(forkedMovie.tags).toEqual(['drama']);
    expect(forkedMovie.specs).toEqual({duration: 120});

    forkedMovie.title = 'Inception 2';
    forkedMovie.tags.push('action');
    forkedMovie.specs.duration = 125;

    expect(forkedMovie.title).toBe('Inception 2');
    expect(forkedMovie.tags).toEqual(['drama', 'action']);
    expect(forkedMovie.specs).toEqual({duration: 125});
    expect(movie.title).toBe('Inception');
    expect(movie.tags).toEqual(['drama']);
    expect(movie.specs).toEqual({duration: 120});
  });

  test('Nested component', async () => {
    class Movie extends Component {
      @attribute() director;
    }

    class Director extends Component {
      @attribute() name;
    }

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const forkedMovie = movie.fork();

    expect(forkedMovie.director.getComponentName()).toBe('director');
    expect(forkedMovie.director).not.toBe(movie.director);
    expect(forkedMovie.director.name).toBe('Christopher Nolan');

    forkedMovie.director.name = 'Christopher Nolan 2';

    expect(forkedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });
});
