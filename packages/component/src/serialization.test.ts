import {Component, ComponentSet} from './component';
import {EmbeddedComponent} from './embedded-component';
import {attribute, primaryIdentifier, secondaryIdentifier, provide} from './decorators';
import {serialize} from './serialization';

describe('Serialization', () => {
  test('Component classes', async () => {
    class BaseMovie extends Component {}

    expect(BaseMovie.serialize()).toStrictEqual({__component: 'typeof BaseMovie'});

    class Movie extends BaseMovie {
      @attribute() static limit = 100;
      @attribute() static offset: number;
    }

    expect(Movie.serialize()).toStrictEqual({
      __component: 'typeof Movie',
      limit: 100,
      offset: {__undefined: true}
    });

    expect(Movie.serialize({attributeSelector: {limit: true}})).toStrictEqual({
      __component: 'typeof Movie',
      limit: 100
    });

    expect(Movie.serialize({returnComponentReferences: true})).toStrictEqual({
      __component: 'typeof Movie'
    });

    // - Value sourcing -

    Movie.getAttribute('limit').setValueSource(-1);

    expect(Movie.serialize()).toStrictEqual({
      __component: 'typeof Movie',
      limit: 100,
      offset: {__undefined: true}
    });
    expect(Movie.serialize({target: -1})).toStrictEqual({
      __component: 'typeof Movie',
      offset: {__undefined: true}
    });

    Movie.getAttribute('offset').setValueSource(-1);

    expect(Movie.serialize({target: -1})).toStrictEqual({
      __component: 'typeof Movie'
    });

    // --- With referenced components ---

    class Cinema extends Component {
      @attribute() static limit = 100;

      @attribute() static MovieClass = Movie;
    }

    expect(Cinema.serialize()).toStrictEqual({
      __component: 'typeof Cinema',
      limit: 100,
      MovieClass: {__component: 'typeof Movie'}
    });

    let componentDependencies: ComponentSet = new Set();

    expect(Cinema.serialize({componentDependencies})).toStrictEqual({
      __component: 'typeof Cinema',
      limit: 100,
      MovieClass: {__component: 'typeof Movie'}
    });
    expect(Array.from(componentDependencies)).toStrictEqual([]);

    componentDependencies = new Set();

    expect(
      Cinema.serialize({returnComponentReferences: true, componentDependencies})
    ).toStrictEqual({
      __component: 'typeof Cinema'
    });
    expect(Array.from(componentDependencies)).toStrictEqual([]);
  });

  test('Component instances', async () => {
    class Person extends EmbeddedComponent {
      @attribute() name?: string;
      @attribute() country?: string;
    }

    class Director extends Person {}
    class Actor extends Person {}

    class Movie extends Component {
      @provide() static Director = Director;
      @provide() static Actor = Actor;

      @attribute() title = '';
      @attribute('Director?') director?: Director;
      @attribute('Actor[]') actors = new Array<Actor>();
    }

    let movie = new Movie();

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      __new: true,
      title: '',
      director: {__undefined: true},
      actors: []
    });

    expect(movie.serialize({attributeSelector: {title: true}})).toStrictEqual({
      __component: 'Movie',
      __new: true,
      title: ''
    });

    expect(movie.serialize({includeIsNewMarks: false})).toStrictEqual({
      __component: 'Movie',
      title: '',
      director: {__undefined: true},
      actors: []
    });

    movie = Movie.create({}, {isNew: false});

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie'
    });

    expect(movie.serialize({includeComponentTypes: false})).toStrictEqual({});

    movie.title = 'Inception';

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      title: 'Inception'
    });

    expect(movie.serialize({includeComponentTypes: false})).toStrictEqual({
      title: 'Inception'
    });

    // - Value sourcing -

    movie = Movie.create({title: 'Inception'}, {isNew: false, source: -1});

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      title: 'Inception'
    });
    expect(movie.serialize({target: -1})).toStrictEqual({
      __component: 'Movie'
    });

    // --- With an embedded component ---

    movie.director = new Director({name: 'Christopher Nolan'});

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      title: 'Inception',
      director: {
        __component: 'Director',
        __new: true,
        name: 'Christopher Nolan',
        country: {__undefined: true}
      }
    });

    expect(
      movie.serialize({attributeSelector: {title: true, director: {name: true}}})
    ).toStrictEqual({
      __component: 'Movie',
      title: 'Inception',
      director: {__component: 'Director', __new: true, name: 'Christopher Nolan'}
    });

    expect(movie.serialize({attributeSelector: {title: true, director: {}}})).toStrictEqual({
      __component: 'Movie',
      title: 'Inception',
      director: {__component: 'Director', __new: true}
    });

    expect(movie.serialize({includeIsNewMarks: false})).toStrictEqual({
      __component: 'Movie',
      title: 'Inception',
      director: {__component: 'Director', name: 'Christopher Nolan', country: {__undefined: true}}
    });

    expect(
      movie.serialize({
        attributeFilter(attribute) {
          expect(this).toBe(movie);
          expect(attribute.getParent()).toBe(movie);
          return attribute.getName() === 'title';
        }
      })
    ).toStrictEqual({
      __component: 'Movie',
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
    ).toStrictEqual({
      __component: 'Movie',
      title: 'Inception'
    });

    // - Value sourcing -

    movie
      .getAttribute('director')
      .setValue(
        Director.create({name: 'Christopher Nolan', country: 'USA'}, {isNew: false, source: -1}),
        {source: -1}
      );

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      title: 'Inception',
      director: {__component: 'Director', name: 'Christopher Nolan', country: 'USA'}
    });

    expect(movie.serialize({target: -1})).toStrictEqual({__component: 'Movie'});

    movie.director.country = 'US';

    expect(movie.serialize({target: -1})).toStrictEqual({
      __component: 'Movie',
      director: {__component: 'Director', country: 'US'}
    });

    // --- With an array of embedded components ---

    movie.actors = [new Actor({name: 'Leonardo DiCaprio'})];

    expect(movie.serialize({attributeSelector: {actors: true}})).toStrictEqual({
      __component: 'Movie',
      actors: [
        {__component: 'Actor', __new: true, name: 'Leonardo DiCaprio', country: {__undefined: true}}
      ]
    });

    // - Value sourcing -

    movie
      .getAttribute('actors')
      .setValue(
        [Actor.create({name: 'Leonardo DiCaprio', country: 'USA'}, {isNew: false, source: -1})],
        {
          source: -1
        }
      );

    expect(movie.serialize({attributeSelector: {actors: true}})).toStrictEqual({
      __component: 'Movie',
      actors: [{__component: 'Actor', name: 'Leonardo DiCaprio', country: 'USA'}]
    });

    expect(movie.serialize({attributeSelector: {actors: true}, target: -1})).toStrictEqual({
      __component: 'Movie'
    });

    movie.actors[0].country = 'US';

    expect(movie.serialize({attributeSelector: {actors: true}, target: -1})).toStrictEqual({
      __component: 'Movie',
      actors: [{__component: 'Actor', name: 'Leonardo DiCaprio', country: 'US'}]
    });
  });

  test('Identifiable component instances', async () => {
    class Movie extends Component {
      @primaryIdentifier() id!: string;
      @secondaryIdentifier() slug!: string;
      @attribute('string') title = '';
    }

    let movie = Movie.fork().create({title: 'Inception'}, {isNew: false});

    expect(movie.serialize()).toEqual({
      __component: 'Movie',
      title: 'Inception'
    });

    expect(() => movie.serialize({returnComponentReferences: true})).toThrow(
      "Cannot get an identifier descriptor from a component that has no set identifier (component: 'Movie')"
    );

    movie = Movie.fork().create({id: 'abc123', title: 'Inception'}, {isNew: false});

    expect(movie.serialize()).toEqual({
      __component: 'Movie',
      id: 'abc123',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'Movie',
      id: 'abc123'
    });

    movie = Movie.fork().create({slug: 'inception', title: 'Inception'}, {isNew: false});

    expect(movie.serialize()).toEqual({
      __component: 'Movie',
      slug: 'inception',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'Movie',
      slug: 'inception'
    });

    movie = Movie.fork().create(
      {id: 'abc123', slug: 'inception', title: 'Inception'},
      {isNew: false}
    );

    expect(movie.serialize()).toEqual({
      __component: 'Movie',
      id: 'abc123',
      slug: 'inception',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'Movie',
      id: 'abc123'
    });

    // - Value sourcing -

    movie = Movie.fork().create({id: 'abc123', title: 'Inception'}, {isNew: false, source: -1});

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      id: 'abc123',
      title: 'Inception'
    });
    expect(movie.serialize({target: -1})).toStrictEqual({
      __component: 'Movie',
      id: 'abc123'
    });

    // --- With referenced identifiable component instances ---

    class Cinema extends Component {
      @provide() static Movie = Movie;

      @primaryIdentifier() id!: string;
      @attribute('string') name = '';
      @attribute('Movie[]') movies!: Movie[];
    }

    movie = Movie.create({id: 'abc123', title: 'Inception'}, {isNew: false});

    const cinema = Cinema.create(
      {
        id: 'xyz456',
        name: 'Paradiso',
        movies: [movie]
      },
      {isNew: false}
    );

    expect(cinema.serialize()).toEqual({
      __component: 'Cinema',
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'Movie', id: 'abc123'}]
    });

    let componentDependencies: ComponentSet = new Set();

    expect(cinema.serialize({componentDependencies})).toEqual({
      __component: 'Cinema',
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'Movie', id: 'abc123'}]
    });
    expect(Array.from(componentDependencies)).toEqual([Cinema, Movie]);

    componentDependencies = new Set();

    expect(cinema.serialize({returnComponentReferences: true, componentDependencies})).toEqual({
      __component: 'Cinema',
      id: 'xyz456'
    });
    expect(Array.from(componentDependencies)).toEqual([Cinema, Movie]);
  });

  test('Functions', async () => {
    function sum(a: number, b: number) {
      return a + b;
    }

    expect(serialize(sum)).toStrictEqual({});
    expect(trimSerializedFunction(serialize(sum, {serializeFunctions: true}))).toStrictEqual({
      __function: 'function sum(a, b) {\nreturn a + b;\n}'
    });

    sum.displayName = 'sum';

    expect(serialize(sum)).toStrictEqual({displayName: 'sum'});
    expect(trimSerializedFunction(serialize(sum, {serializeFunctions: true}))).toStrictEqual({
      __function: 'function sum(a, b) {\nreturn a + b;\n}',
      displayName: 'sum'
    });

    function trimSerializedFunction(serializedFunction: any) {
      return {
        ...serializedFunction,
        __function: serializedFunction.__function.replace(/\n +/g, '\n')
      };
    }
  });
});
