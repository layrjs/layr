import {Component} from './component';
import {attribute, provide} from './decorators';

describe('Forking', () => {
  test('Simple component', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;

      @attribute() title!: string;
      @attribute() tags!: string[];
      @attribute() specs!: {duration?: number};
    }

    const MovieFork = Movie.fork();

    expect(MovieFork.getComponentType()).toBe('typeof Movie');
    expect(MovieFork.limit).toBe(100);

    expect(MovieFork.isForkOf(Movie)).toBe(true);
    expect(MovieFork.isForkOf(MovieFork)).toBe(false);
    expect(Movie.isForkOf(MovieFork)).toBe(false);

    MovieFork.limit = 500;

    expect(MovieFork.limit).toBe(500);
    expect(Movie.limit).toBe(100);

    const GhostMovie = Movie.getGhost();
    const SameGhostMovie = Movie.getGhost();

    expect(GhostMovie.isForkOf(Movie)).toBe(true);
    expect(SameGhostMovie).toBe(GhostMovie);

    const movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    expect(movie).toBeInstanceOf(Component);
    expect(movie).toBeInstanceOf(Movie);

    let movieFork = movie.fork();

    expect(movieFork).toBeInstanceOf(Component);
    expect(movieFork).toBeInstanceOf(Movie);

    expect(movieFork.getComponentType()).toBe('Movie');
    expect(movieFork.title).toBe('Inception');
    expect(movieFork.tags).toEqual(['drama']);
    expect(movieFork.specs).toEqual({duration: 120});

    expect(movieFork.isForkOf(movie)).toBe(true);
    expect(movieFork.isForkOf(movieFork)).toBe(false);
    expect(movie.isForkOf(movieFork)).toBe(false);

    movieFork.title = 'Inception 2';
    movieFork.tags.push('action');
    movieFork.specs.duration = 125;

    expect(movieFork.title).toBe('Inception 2');
    expect(movieFork.tags).toEqual(['drama', 'action']);
    expect(movieFork.specs).toEqual({duration: 125});
    expect(movie.title).toBe('Inception');
    expect(movie.tags).toEqual(['drama']);
    expect(movie.specs).toEqual({duration: 120});

    movieFork = movie.fork({componentClass: MovieFork});

    expect(movieFork).toBeInstanceOf(Component);
    expect(movieFork).toBeInstanceOf(Movie);
    expect(movieFork).toBeInstanceOf(MovieFork);

    expect(() => movie.getGhost()).toThrow(
      "Cannot get the identifiers of a component that has no set identifier (component: 'Movie')"
    );
  });

  test('Component provision', async () => {
    class MovieDetails extends Component {}

    class Movie extends Component {
      @provide() static MovieDetails = MovieDetails;
    }

    class App extends Component {
      @provide() static Movie = Movie;
    }

    const GhostApp = App.getGhost();
    const SameGhostApp = App.getGhost();

    expect(GhostApp.isForkOf(App)).toBe(true);
    expect(SameGhostApp).toBe(GhostApp);

    const GhostMovie = Movie.getGhost();
    const SameGhostMovie = Movie.getGhost();

    expect(GhostMovie.isForkOf(Movie)).toBe(true);
    expect(SameGhostMovie).toBe(GhostMovie);
    expect(GhostApp.Movie).toBe(GhostMovie);

    const GhostMovieDetails = MovieDetails.getGhost();
    const SameGhostMovieDetails = MovieDetails.getGhost();

    expect(GhostMovieDetails.isForkOf(MovieDetails)).toBe(true);
    expect(SameGhostMovieDetails).toBe(GhostMovieDetails);
    expect(GhostMovie.MovieDetails).toBe(GhostMovieDetails);
    expect(GhostApp.Movie.MovieDetails).toBe(GhostMovieDetails);
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

    const movieFork = movie.fork();

    expect(movieFork.director).not.toBe(movie.director);
    expect(movieFork.director.name).toBe('Christopher Nolan');
    expect(movieFork.director.constructor.isForkOf(Director)).toBe(true);
    expect(movieFork.director.isForkOf(movie.director)).toBe(true);

    movieFork.director.name = 'Christopher Nolan 2';

    expect(movieFork.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });
});
