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

    const ForkedMovie = Movie.fork();

    expect(ForkedMovie.getComponentType()).toBe('typeof Movie');
    expect(ForkedMovie.limit).toBe(100);

    expect(ForkedMovie.isForkOf(Movie)).toBe(true);
    expect(ForkedMovie.isForkOf(ForkedMovie)).toBe(false);
    expect(Movie.isForkOf(ForkedMovie)).toBe(false);

    ForkedMovie.limit = 500;

    expect(ForkedMovie.limit).toBe(500);
    expect(Movie.limit).toBe(100);

    const GhostMovie = Movie.getGhost();
    const SameGhostMovie = Movie.getGhost();

    expect(GhostMovie.isForkOf(Movie)).toBe(true);
    expect(SameGhostMovie).toBe(GhostMovie);

    const movie = new Movie({title: 'Inception', tags: ['drama'], specs: {duration: 120}});

    expect(movie).toBeInstanceOf(Component);
    expect(movie).toBeInstanceOf(Movie);

    let forkedMovie = movie.fork();

    expect(forkedMovie).toBeInstanceOf(Component);
    expect(forkedMovie).toBeInstanceOf(Movie);

    expect(forkedMovie.getComponentType()).toBe('Movie');
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

    forkedMovie = movie.fork({componentClass: ForkedMovie});

    expect(forkedMovie).toBeInstanceOf(Component);
    expect(forkedMovie).toBeInstanceOf(Movie);
    expect(forkedMovie).toBeInstanceOf(ForkedMovie);

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

  test('Nested component', async () => {
    class Director extends Component {
      @attribute() name!: string;
    }

    class Movie extends Component {
      @provide() static Director = Director;

      @attribute() director!: Director;
    }

    const movie = new Movie({director: new Director({name: 'Christopher Nolan'})});

    const forkedMovie = movie.fork();

    expect(forkedMovie.director).not.toBe(movie.director);
    expect(forkedMovie.director.name).toBe('Christopher Nolan');
    expect(forkedMovie.director.constructor.isForkOf(Director)).toBe(true);
    expect(forkedMovie.director.isForkOf(movie.director)).toBe(true);

    forkedMovie.director.name = 'Christopher Nolan 2';

    expect(forkedMovie.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });
});
