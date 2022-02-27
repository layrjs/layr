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

    const MovieFork = Movie.fork();

    MovieFork.limit = 500;

    expect(Movie.limit).toBe(100);

    Movie.merge(MovieFork);

    expect(Movie.limit).toBe(500);

    const movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    const movieFork = movie.fork();

    movieFork.title = 'Inception 2';
    movieFork.tags.push('action');
    movieFork.specs.duration = 125;

    expect(movie.title).toBe('Inception');
    expect(movie.tags).toEqual(['drama']);
    expect(movie.specs).toEqual({duration: 120});

    movie.merge(movieFork);

    expect(movie.title).toBe('Inception 2');
    expect(movie.tags).not.toBe(movieFork.tags);
    expect(movie.tags).toEqual(['drama', 'action']);
    expect(movie.specs).not.toBe(movieFork.specs);
    expect(movie.specs).toEqual({duration: 125});

    movieFork.getAttribute('title').unsetValue();

    expect(movie.getAttribute('title').isSet()).toBe(true);

    movie.merge(movieFork);

    expect(movie.getAttribute('title').isSet()).toBe(false);

    movieFork.title = 'Inception 3';
    movieFork.tags = ['action', 'adventure', 'sci-fi'];

    movie.merge(movieFork, {attributeSelector: {title: true}});

    expect(movie.title).toBe('Inception 3');
    expect(movie.tags).toEqual(['drama', 'action']);
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

    const movieFork = movie.fork();

    movieFork.director.name = 'Christopher Nolan 2';

    expect(movie.director.name).toBe('Christopher Nolan');

    movie.merge(movieFork);

    expect(movie.director.name).toBe('Christopher Nolan 2');

    // Although merged, the director should have kept its identity
    expect(movie.director).toBe(director);
  });
});
