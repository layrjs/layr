import {Component} from './component';
import {attribute, provide} from './decorators';

describe('Merging', () => {
  test('Simple component', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;

      @attribute() title!: string;
      @attribute() tags!: string[];
      @attribute() specs!: {duration?: number};
    }

    const ForkedMovie = Movie.fork();

    ForkedMovie.limit = 500;

    expect(Movie.limit).toBe(100);

    Movie.merge(ForkedMovie);

    expect(Movie.limit).toBe(500);

    const movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    const forkedMovie = movie.fork();

    forkedMovie.title = 'Inception 2';
    forkedMovie.tags.push('action');
    forkedMovie.specs.duration = 125;

    expect(movie.title).toBe('Inception');
    expect(movie.tags).toEqual(['drama']);
    expect(movie.specs).toEqual({duration: 120});

    movie.merge(forkedMovie);

    expect(movie.title).toBe('Inception 2');
    expect(movie.tags).not.toBe(forkedMovie.tags);
    expect(movie.tags).toEqual(['drama', 'action']);
    expect(movie.specs).not.toBe(forkedMovie.specs);
    expect(movie.specs).toEqual({duration: 125});

    forkedMovie.getAttribute('title').unsetValue();

    expect(movie.getAttribute('title').isSet()).toBe(true);

    movie.merge(forkedMovie);

    expect(movie.getAttribute('title').isSet()).toBe(false);
  });

  test('Referenced component', async () => {
    class Director extends Component {
      @attribute() name!: string;
    }

    class Movie extends Component {
      @provide() static Director = Director;

      @attribute() director!: Director;
    }

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const director = movie.director;

    const forkedMovie = movie.fork();

    forkedMovie.director.name = 'Christopher Nolan 2';

    expect(movie.director.name).toBe('Christopher Nolan');

    movie.merge(forkedMovie);

    expect(movie.director.name).toBe('Christopher Nolan 2');

    // Although merged, the director should have kept its identity
    expect(movie.director).toBe(director);
  });
});
