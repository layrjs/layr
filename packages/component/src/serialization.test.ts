import {Component} from './component';
import {attribute, primaryIdentifier, secondaryIdentifier, provide} from './decorators';
import {serialize, SerializeOptions} from './serialization';

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

    // TODO
    // // --- With value sourcing ---

    // Movie.getAttribute('limit').setValueSource(1);

    // expect(Movie.serialize()).toStrictEqual({
    //   __component: 'typeof Movie',
    //   limit: 100,
    //   offset: {__undefined: true}
    // });
    // expect(Movie.serialize({target: 1})).toStrictEqual({
    //   __component: 'typeof Movie',
    //   offset: {__undefined: true}
    // });

    // Movie.getAttribute('offset').setValueSource(1);

    // expect(Movie.serialize({target: 1})).toStrictEqual({
    //   __component: 'typeof Movie'
    // });

    // --- With nested components ---

    class Cinema extends Component {
      @attribute() static limit = 100;

      @attribute() static MovieClass = Movie;
    }

    expect(Cinema.serialize()).toStrictEqual({
      __component: 'typeof Cinema',
      limit: 100,
      MovieClass: {__component: 'typeof Movie'}
    });

    let referencedComponents: Set<typeof Component> = new Set();

    expect(Cinema.serialize({referencedComponents})).toStrictEqual({
      __component: 'typeof Cinema',
      limit: 100,
      MovieClass: {__component: 'typeof Movie'}
    });
    expect(Array.from(referencedComponents)).toStrictEqual([Movie]);

    referencedComponents = new Set();

    expect(Cinema.serialize({returnComponentReferences: true, referencedComponents})).toStrictEqual(
      {
        __component: 'typeof Cinema'
      }
    );
    expect(Array.from(referencedComponents)).toStrictEqual([Cinema]);
  });

  test('Component instances', async () => {
    class Movie extends Component {
      @attribute() title = '';
      @attribute() director?: Director;
    }

    let movie = new Movie();

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      __new: true,
      title: '',
      director: {__undefined: true}
    });

    expect(movie.serialize({attributeSelector: {title: true}})).toStrictEqual({
      __component: 'Movie',
      __new: true,
      title: ''
    });

    expect(movie.serialize({includeIsNewMarks: false})).toStrictEqual({
      __component: 'Movie',
      title: '',
      director: {__undefined: true}
    });

    movie = Movie.create({}, {isNew: false});

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      __new: false
    });

    expect(movie.serialize({includeComponentTypes: false})).toStrictEqual({__new: false});

    movie.title = 'Inception';

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      __new: false,
      title: 'Inception'
    });

    expect(movie.serialize({includeComponentTypes: false})).toStrictEqual({
      title: 'Inception',
      __new: false
    });

    // TODO
    // // --- With value sourcing ---

    // movie = Movie.create({title: 'Inception'}, {isNew: false, source: 1});

    // expect(movie.serialize()).toStrictEqual({
    //   __component: 'Movie',
    //   __new: false,
    //   title: 'Inception'
    // });
    // expect(movie.serialize({target: 1})).toStrictEqual({
    //   __component: 'Movie',
    //   __new: false,
    //   title: 'Inception'
    // });

    // --- With nested components ---

    class Director extends Component {
      @attribute() name?: string;
      @attribute() country?: string;
    }

    movie.director = new Director({name: 'Christopher Nolan'});

    expect(movie.serialize()).toStrictEqual({
      __component: 'Movie',
      __new: false,
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
      __new: false,
      title: 'Inception',
      director: {__component: 'Director', __new: true, name: 'Christopher Nolan'}
    });

    expect(movie.serialize({attributeSelector: {title: true, director: {}}})).toStrictEqual({
      __component: 'Movie',
      __new: false,
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
      __new: false,
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
      __new: false,
      title: 'Inception'
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
      __new: false,
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'Movie',
      __new: false,
      title: 'Inception'
    });

    movie = Movie.fork().create({id: 'abc123', title: 'Inception'}, {isNew: false});

    expect(movie.serialize()).toEqual({
      __component: 'Movie',
      __new: false,
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
      __new: false,
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
      __new: false,
      id: 'abc123',
      slug: 'inception',
      title: 'Inception'
    });

    expect(movie.serialize({returnComponentReferences: true})).toEqual({
      __component: 'Movie',
      id: 'abc123'
    });

    // TODO
    // // --- With value sourcing ---

    // movie = Movie.fork().create({id: 'abc123', title: 'Inception'}, {isNew: false, source: 1});

    // expect(movie.serialize()).toStrictEqual({
    //   __component: 'Movie',
    //   __new: false,
    //   id: 'abc123',
    //   title: 'Inception'
    // });
    // expect(movie.serialize({target: 1})).toStrictEqual({
    //   __component: 'Movie',
    //   id: 'abc123'
    // });

    // --- With nested identifiable component instances ---

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
      __new: false,
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'Movie', id: 'abc123'}]
    });

    expect(cinema.serialize({includeReferencedComponents: true})).toEqual({
      __component: 'Cinema',
      __new: false,
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'Movie', __new: false, id: 'abc123', title: 'Inception'}]
    });

    let referencedComponents: SerializeOptions['referencedComponents'] = new Set();

    expect(cinema.serialize({referencedComponents})).toEqual({
      __component: 'Cinema',
      __new: false,
      id: 'xyz456',
      name: 'Paradiso',
      movies: [{__component: 'Movie', id: 'abc123'}]
    });
    expect(Array.from(referencedComponents)).toEqual([Movie, movie]);

    referencedComponents = new Set();

    expect(cinema.serialize({returnComponentReferences: true, referencedComponents})).toEqual({
      __component: 'Cinema',
      id: 'xyz456'
    });
    expect(Array.from(referencedComponents)).toEqual([Movie, Cinema, cinema]);
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

    sum.__context = {x: 1, y: 2};

    expect(serialize(sum)).toStrictEqual({displayName: 'sum', __context: {x: 1, y: 2}});
    expect(trimSerializedFunction(serialize(sum, {serializeFunctions: true}))).toStrictEqual({
      __function: 'function sum(a, b) {\nreturn a + b;\n}',
      displayName: 'sum',
      __context: {x: 1, y: 2}
    });

    function trimSerializedFunction(serializedFunction: any) {
      return {
        ...serializedFunction,
        __function: serializedFunction.__function.replace(/\n +/g, '\n')
      };
    }
  });
});
