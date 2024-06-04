import {Component} from './component';
import {attribute, consume, provide} from './decorators';

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
    class MovieDetails extends Component {
      @consume() static App: typeof App;
      @consume() static Movie: typeof Movie;
    }

    class Movie extends Component {
      @consume() static App: typeof App;
      @consume() static MovieDetails: typeof MovieDetails;
    }

    class App extends Component {
      @provide() static Movie = Movie;
      @provide() static MovieDetails = MovieDetails;
    }

    // ---

    const AppFork = App.fork();

    expect(AppFork.Movie).not.toBe(App.Movie);
    expect(AppFork.Movie.isForkOf(App.Movie)).toBe(true);
    expect(AppFork.MovieDetails).not.toBe(App.MovieDetails);
    expect(AppFork.MovieDetails.isForkOf(App.MovieDetails)).toBe(true);
    expect(AppFork.Movie.App).toBe(AppFork);
    expect(AppFork.Movie.MovieDetails.App).toBe(AppFork);

    // ---

    const MovieFork = App.Movie.fork();

    expect(MovieFork.App).not.toBe(App);
    expect(MovieFork.App.isForkOf(App)).toBe(true);
    expect(MovieFork.App.Movie).toBe(MovieFork);
    expect(MovieFork.MovieDetails.Movie).toBe(MovieFork);

    // ---

    const GhostApp = App.getGhost();
    const SameGhostApp = App.getGhost();

    expect(GhostApp.isForkOf(App)).toBe(true);
    expect(SameGhostApp).toBe(GhostApp);

    const GhostMovie = App.Movie.getGhost();
    const SameGhostMovie = GhostApp.Movie.getGhost();

    expect(GhostMovie.isForkOf(Movie)).toBe(true);
    expect(SameGhostMovie).toBe(GhostMovie);
    expect(GhostApp.Movie).toBe(GhostMovie);
    expect(SameGhostApp.Movie).toBe(GhostMovie);

    const GhostMovieDetails = App.Movie.MovieDetails.getGhost();
    const SameGhostMovieDetails = GhostApp.Movie.MovieDetails.getGhost();

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
      declare ['constructor']: typeof Movie;

      @consume() static Director: typeof Director;

      @attribute() director!: Director;
    }

    class App extends Component {
      @provide() static Movie = Movie;
      @provide() static Director = Director;
    }

    const movie = new App.Movie({director: new App.Movie.Director({name: 'Christopher Nolan'})});

    const movieFork = movie.fork();

    expect(movieFork.constructor).not.toBe(movie.constructor);
    expect(movieFork.constructor.Director).not.toBe(movie.constructor.Director);
    expect(movieFork.director).not.toBe(movie.director);
    expect(movieFork.director.name).toBe('Christopher Nolan');
    expect(movieFork.director.constructor.isForkOf(App.Movie.Director)).toBe(true);
    expect(movieFork.director.constructor).toBe(movieFork.constructor.Director);
    expect(movieFork.director.isForkOf(movie.director)).toBe(true);

    movieFork.director.name = 'Christopher Nolan 2';

    expect(movieFork.director.name).toBe('Christopher Nolan 2');
    expect(movie.director.name).toBe('Christopher Nolan');
  });

  test('Array of referenced components', async () => {
    class Actor extends Component {
      @attribute() name!: string;
    }

    class Movie extends Component {
      declare ['constructor']: typeof Movie;

      @provide() static Actor = Actor;

      @attribute() actors!: Actor[];
    }

    const movie = new Movie({
      actors: [new Actor({name: 'Leonardo DiCaprio'}), new Actor({name: 'Joseph Gordon-Levitt'})]
    });

    expect(movie.actors[0].constructor).toBe(movie.actors[1].constructor);

    const movieFork = movie.fork();

    expect(movieFork.actors[0]).not.toBe(movie.actors[0]);
    expect(movieFork.actors[0].name).toBe('Leonardo DiCaprio');
    expect(movieFork.actors[0].constructor.isForkOf(Actor)).toBe(true);
    expect(movieFork.actors[0].constructor).toBe(movieFork.constructor.Actor);
    expect(movieFork.actors[0].isForkOf(movie.actors[0])).toBe(true);
    movieFork.actors[0].name = 'Leonardo DiCaprio 2';
    expect(movieFork.actors[0].name).toBe('Leonardo DiCaprio 2');
    expect(movie.actors[0].name).toBe('Leonardo DiCaprio');

    expect(movieFork.actors[1]).not.toBe(movie.actors[1]);
    expect(movieFork.actors[1].name).toBe('Joseph Gordon-Levitt');
    expect(movieFork.actors[1].constructor.isForkOf(Actor)).toBe(true);
    expect(movieFork.actors[1].constructor).toBe(movieFork.constructor.Actor);
    expect(movieFork.actors[1].isForkOf(movie.actors[1])).toBe(true);
    movieFork.actors[1].name = 'Joseph Gordon-Levitt 2';
    expect(movieFork.actors[1].name).toBe('Joseph Gordon-Levitt 2');
    expect(movie.actors[1].name).toBe('Joseph Gordon-Levitt');

    expect(movieFork.actors[0].constructor).toBe(movieFork.actors[1].constructor);
  });
});
