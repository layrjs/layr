import {Component} from './component';
import {attribute} from './decorators';

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

    // TODO
    // expect(() => Movie.getGhost()).toThrow(
    //   "Cannot get the ghost of a component class that is not registered into a layer (component name: 'Movie')"
    // );

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

    forkedMovie = movie.fork({parentComponent: ForkedMovie});

    expect(forkedMovie).toBeInstanceOf(Component);
    expect(forkedMovie).toBeInstanceOf(Movie);
    expect(forkedMovie).toBeInstanceOf(ForkedMovie);

    // TODO
    // expect(() => movie.getGhost()).toThrow(
    //   "Cannot get the ghost of a component that is not managed by an entity manager (component name: 'movie')"
    // );
  });

  // TODO
  // test('Component registered into a layer', async () => {
  //   class Movie extends Component {}

  //   const layer = new Layer([Movie]);

  //   const GhostMovie = Movie.getGhost();

  //   expect(GhostMovie.isForkOf(Movie)).toBe(true);

  //   const OtherGhostMovie = Movie.getGhost();

  //   expect(OtherGhostMovie).toBe(GhostMovie);

  //   const ghostLayer = layer.getGhost();

  //   expect(ghostLayer.Movie).toBe(GhostMovie);
  // });

  test('Nested component', async () => {
    class Movie extends Component {
      @attribute() director!: Director;
    }

    class Director extends Component {
      @attribute() name!: string;
    }

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
