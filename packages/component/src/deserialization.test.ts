import {Component} from './component';
import {EmbeddedComponent} from './embedded-component';
import {provide, attribute, primaryIdentifier} from './decorators';
import {deserialize} from './deserialization';

describe('Deserialization', () => {
  test('Component classes', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @attribute() static offset: number;
    }

    expect(Movie.limit).toBe(100);
    expect(Movie.offset).toBeUndefined();

    // --- Using the deserialize() function ---

    const componentGetter = function (type: string): any {
      if (type === 'typeof Movie') {
        return Movie;
      }

      throw new Error('Component not found');
    };

    let DeserializedMovie = deserialize(
      {
        __component: 'typeof Movie',
        limit: {__undefined: true},
        offset: 30
      },
      {componentGetter}
    );

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBeUndefined();
    expect(Movie.offset).toBe(30);

    DeserializedMovie = deserialize(
      {__component: 'typeof Movie', limit: 1000, offset: {__undefined: true}},
      {componentGetter}
    );

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBe(1000);
    expect(Movie.offset).toBeUndefined();

    DeserializedMovie = deserialize({__component: 'typeof Movie'}, {componentGetter});

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBe(1000);
    expect(Movie.offset).toBeUndefined();

    expect(() => deserialize({__component: 'typeof Film'}, {componentGetter})).toThrow(
      'Component not found'
    );

    expect(() => deserialize({__component: 'typeof Movie'})).toThrow(
      "Cannot deserialize a component without a 'componentGetter'"
    );

    // --- Using the deserialize() function with the 'source' option ---

    expect(Movie.limit).toBe(1000);
    expect(Movie.getAttribute('limit').getValueSource()).toBe(0);

    DeserializedMovie = deserialize(
      {__component: 'typeof Movie', limit: 5000},
      {source: 1, componentGetter}
    );

    expect(Movie.limit).toBe(5000);
    expect(Movie.getAttribute('limit').getValueSource()).toBe(1);

    DeserializedMovie = deserialize({__component: 'typeof Movie', limit: 5000}, {componentGetter});

    expect(Movie.limit).toBe(5000);
    expect(Movie.getAttribute('limit').getValueSource()).toBe(0);

    // --- Using Component.deserialize() method ---

    DeserializedMovie = Movie.deserialize({limit: {__undefined: true}, offset: 100});

    expect(DeserializedMovie).toBe(Movie);
    expect(Movie.limit).toBeUndefined();
    expect(Movie.offset).toBe(100);

    expect(() => Movie.deserialize({__component: 'typeof Film'})).toThrow(
      "An unexpected component type was encountered while deserializing an object (encountered type: 'typeof Film', expected type: 'typeof Movie')"
    );
  });

  test('Component instances', async () => {
    class Movie extends Component {
      @attribute() title?: string;
      @attribute() duration = 0;
    }

    // --- Using the deserialize() function ---

    let componentGetter = function (type: string) {
      if (type === 'Movie') {
        return Movie.prototype;
      }

      throw new Error('Component not found');
    };

    let movie = deserialize({__component: 'Movie', title: 'Inception'}, {componentGetter}) as Movie;

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie = deserialize(
      {__component: 'Movie', __new: true, title: 'Inception'},
      {componentGetter}
    ) as Movie;

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(0);

    movie = deserialize(
      {__component: 'Movie', __new: true, duration: {__undefined: true}},
      {componentGetter}
    ) as Movie;

    expect(movie.title).toBeUndefined();
    expect(movie.duration).toBeUndefined();

    movie = deserialize(
      {__component: 'Movie', __new: true, title: 'Inception', duration: 120},
      {
        componentGetter,
        attributeFilter(attribute) {
          expect(this).toBeInstanceOf(Movie);
          expect(attribute.getParent()).toBe(this);
          return attribute.getName() === 'title';
        }
      }
    ) as Movie;

    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(0);

    expect(() => deserialize({__component: 'Film'}, {componentGetter})).toThrow(
      'Component not found'
    );

    // --- Using the deserialize() function with the 'source' option ---

    movie = deserialize({__component: 'Movie', title: 'Inception'}, {componentGetter}) as Movie;

    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('title').getValueSource()).toBe(0);
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie = deserialize(
      {__component: 'Movie', title: 'Inception'},
      {source: 1, componentGetter}
    ) as Movie;

    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('title').getValueSource()).toBe(1);
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie = deserialize(
      {__component: 'Movie', __new: true, title: 'Inception'},
      {source: 1, componentGetter}
    ) as Movie;

    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('title').getValueSource()).toBe(1);
    expect(movie.duration).toBe(0);
    expect(movie.getAttribute('duration').getValueSource()).toBe(0);

    // --- Using Component.recreate() method ---

    movie = Movie.recreate({__component: 'Movie', title: 'Inception'}) as Movie;

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.getAttribute('duration').isSet()).toBe(false);

    movie = Movie.recreate({__new: true, title: 'Inception'}) as Movie;

    expect(movie).toBeInstanceOf(Movie);
    expect(movie).not.toBe(Movie.prototype);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(0);

    expect(() => Movie.recreate({__component: 'Film'})).toThrow(
      "An unexpected component type was encountered while deserializing an object (encountered type: 'Film', expected type: 'Movie')"
    );

    // --- Using component.deserialize() method ---

    movie = Movie.create();

    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBeUndefined();
    expect(movie.duration).toBe(0);

    const deserializedMovie = movie.deserialize({__new: true, title: 'Inception'});

    expect(deserializedMovie).toBe(movie);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(0);

    movie.deserialize({__new: true, duration: 120});

    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(120);

    movie.deserialize({});

    expect(movie).toBe(movie);
    expect(movie.isNew()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(120);

    movie.deserialize({__new: false});

    expect(movie).toBe(movie);
    expect(movie.isNew()).toBe(false);
    expect(movie.title).toBe('Inception');
    expect(movie.duration).toBe(120);

    expect(() => movie.deserialize({__component: 'Film'})).toThrow(
      "An unexpected component type was encountered while deserializing an object (encountered type: 'Film', expected type: 'Movie')"
    );

    expect(() => movie.deserialize({__new: true})).toThrow(
      "Cannot mark as new an existing non-new component (component: 'Movie')"
    );
  });

  test('Embedded component instances', async () => {
    class Person extends EmbeddedComponent {
      @attribute('string') fullName?: string;
    }

    class Movie extends Component {
      @provide() static Person = Person;

      @attribute() title?: string;
      @attribute('Person?') director?: Person;
      @attribute('Person[]?') actors?: Person[];
    }

    const componentGetter = function (type: string): any {
      if (type === 'Movie') {
        return Movie.prototype;
      }

      throw new Error('Component not found');
    };

    const movie1 = deserialize(
      {
        __component: 'Movie',
        title: 'Movie 1',
        director: {__component: 'Person', fullName: 'Person 1'}
      },
      {componentGetter}
    ) as Movie;

    expect(movie1).toBeInstanceOf(Movie);
    expect(movie1.title).toBe('Movie 1');

    const movie1Director = movie1.director;

    expect(movie1Director).toBeInstanceOf(Person);
    expect(movie1Director?.fullName).toBe('Person 1');

    movie1.deserialize({director: {__component: 'Person', fullName: 'Person 1 (modified)'}});

    // The identity of movie1.director should be preserved
    expect(movie1.director).toBe(movie1Director);
    expect(movie1Director?.fullName).toBe('Person 1 (modified)');

    const movie2 = deserialize(
      {
        __component: 'Movie',
        title: 'Movie 2',
        actors: [{__component: 'Person', fullName: 'Person 2'}]
      },
      {componentGetter}
    ) as Movie;

    expect(movie2).toBeInstanceOf(Movie);
    expect(movie2.title).toBe('Movie 2');

    const movie2Actor = movie2.actors![0];

    expect(movie2Actor).toBeInstanceOf(Person);
    expect(movie2Actor?.fullName).toBe('Person 2');

    movie2.deserialize({actors: [{__component: 'Person', fullName: 'Person 2 (modified)'}]});

    // The identity of movie2.actors[0] should NOT be preserved
    expect(movie2.actors![0]).not.toBe(movie2Actor);
    expect(movie2.actors![0].fullName).toBe('Person 2 (modified)');
  });

  test('Referenced component instances', async () => {
    class Person extends Component {
      @primaryIdentifier() id!: string;
      @attribute('string') fullName?: string;
    }

    class Movie extends Component {
      @provide() static Person = Person;

      @primaryIdentifier() id!: string;
      @attribute() title?: string;
      @attribute('Person?') director?: Person;
    }

    const componentGetter = function (type: string): any {
      if (type === 'Movie') {
        return Movie.prototype;
      }

      throw new Error('Component not found');
    };

    const person1 = new Person({id: 'person1', fullName: 'Person 1'});
    const person2 = new Person({id: 'person2', fullName: 'Person 2'});

    const movie1 = new Movie({id: 'movie1', title: 'Movie 1', director: person1});

    expect(movie1.director).toBe(person1);

    let deserializedMovie = deserialize(
      {
        __component: 'Movie',
        id: 'movie1',
        director: {__component: 'Person', id: 'person2'}
      },
      {componentGetter}
    ) as Movie;

    expect(deserializedMovie).toBe(movie1);
    expect(movie1.director).toBe(person2);

    deserializedMovie = deserialize(
      {
        __component: 'Movie',
        id: 'movie1',
        director: {__undefined: true}
      },
      {componentGetter}
    ) as Movie;

    expect(deserializedMovie).toBe(movie1);
    expect(movie1.director).toBeUndefined();
  });

  test('Functions', async () => {
    let serializedFunction: any = {
      __function: 'function sum(a, b) { return a + b; }'
    };

    let func = deserialize(serializedFunction) as Function;

    expect(typeof func).toBe('object');
    expect(func).toEqual(serializedFunction);

    func = deserialize(serializedFunction, {deserializeFunctions: true}) as Function;

    expect(typeof func).toBe('function');
    expect(Object.keys(func)).toEqual([]);
    expect(func.name).toBe('sum');
    expect(func(1, 2)).toBe(3);

    serializedFunction.displayName = 'sum';

    func = deserialize(serializedFunction) as Function;

    expect(typeof func).toBe('object');
    expect(func).toEqual(serializedFunction);

    func = deserialize(serializedFunction, {deserializeFunctions: true}) as Function;

    expect(typeof func).toBe('function');
    expect(func.name).toBe('sum');
    expect(Object.keys(func)).toEqual(['displayName']);
    expect((func as any).displayName).toBe('sum');
    expect(func(1, 2)).toBe(3);
  });
});
