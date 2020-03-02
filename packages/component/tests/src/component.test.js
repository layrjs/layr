import {Component, isComponent, attribute, method} from '../../..';

describe('Component', () => {
  test('Creation', async () => {
    class Movie extends Component() {
      @attribute() title = '';
      @attribute() country = '';

      instanceAttribute = true;
    }

    // Make sure there are no enumerable properties in the class
    expect(Object.keys(Movie)).toHaveLength(0);

    let movie = new Movie();

    expect(isComponent(movie)).toBe(true);
    expect(movie).toBeInstanceOf(Movie);

    expect(Object.keys(movie)).toEqual(['instanceAttribute']);
    expect(movie.instanceAttribute).toBe(true);
    expect(movie.title).toBe('');
    expect(movie.country).toBe('');

    movie = new Movie({title: 'Inception'});

    expect(Object.keys(movie)).toEqual(['instanceAttribute']);
    expect(movie.instanceAttribute).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('');

    movie = new Movie({}, {attributeSelector: false});

    expect(Object.keys(movie)).toEqual(['instanceAttribute']);
    expect(movie.instanceAttribute).toBe(true);
    expect(movie.getAttribute('title').isSet()).toBe(false);
    expect(movie.getAttribute('country').isSet()).toBe(false);

    movie = new Movie({}, {attributeSelector: {title: true}});

    expect(Object.keys(movie)).toEqual(['instanceAttribute']);
    expect(movie.instanceAttribute).toBe(true);
    expect(movie.title).toBe('');
    expect(movie.getAttribute('country').isSet()).toBe(false);

    movie = new Movie({title: 'Inception', country: 'USA'}, {attributeSelector: {country: true}});

    expect(Object.keys(movie)).toEqual(['instanceAttribute']);
    expect(movie.instanceAttribute).toBe(true);
    expect(movie.getAttribute('title').isSet()).toBe(false);
    expect(movie.country).toBe('USA');
  });

  test('Instantiation', async () => {
    class Movie extends Component() {
      instanceAttribute = true;
    }

    const movie = Movie.instantiate();

    expect(isComponent(movie)).toBe(true);
    expect(movie).toBeInstanceOf(Movie);

    // Make sure the initializers have not be called
    expect(Object.keys(movie)).toHaveLength(0);
  });

  test('Naming', async () => {
    class Movie extends Component() {}

    expect(Movie.getName()).toBe('Movie');

    Movie.setName('Film');

    expect(Movie.getName()).toBe('Film');

    Movie.setName('MotionPicture');

    expect(Movie.getName()).toBe('MotionPicture');

    // Make sure there are no enumerable properties
    expect(Object.keys(Movie)).toHaveLength(0);

    expect(() => Movie.setName()).toThrow();
    expect(() => Movie.setName(123)).toThrow();
    expect(() => Movie.setName('')).toThrow('A component name cannot be empty');
    expect(() => Movie.setName('1Place')).toThrow(
      "The specified component name ('1Place') is invalid"
    );
    expect(() => Movie.setName('motionPicture')).toThrow(
      "The specified component name ('motionPicture') is invalid"
    );
    expect(() => Movie.setName('MotionPicture!')).toThrow(
      "The specified component name ('MotionPicture!') is invalid"
    );
  });

  test('Related components', async () => {
    class Movie extends Component() {}

    class Director extends Component() {}

    class Actor extends Component() {}

    expect(Movie.getRelatedComponent('Director', {throwIfMissing: false})).toBe(undefined);

    Movie.registerRelatedComponent(Director);
    Movie.registerRelatedComponent(Actor);

    expect(Movie.getRelatedComponent('Director')).toBe(Director);
    expect(Movie.getRelatedComponent('Actor')).toBe(Actor);
    expect(Movie.getRelatedComponent('Producer', {throwIfMissing: false})).toBe(undefined);
    expect(() => Movie.getRelatedComponent('Producer')).toThrow(
      "Cannot get the related component class 'Producer'"
    );
    expect(Movie.getRelatedComponent('director')).toBe(Director.prototype);
    expect(Movie.getRelatedComponent('actor')).toBe(Actor.prototype);
    expect(Movie.getRelatedComponent('producer', {throwIfMissing: false})).toBe(undefined);
    expect(() => Movie.getRelatedComponent('producer')).toThrow(
      "Cannot get the related component class 'Producer'"
    );
  });

  test('isNew mark', async () => {
    class Movie extends Component() {}

    const movie = new Movie();

    expect(movie.isNew()).toBe(true);

    movie.markAsNotNew();

    expect(movie.isNew()).toBe(false);

    movie.markAsNew();

    expect(movie.isNew()).toBe(true);
  });

  test('Forking', async () => {
    class Movie extends Component() {
      @attribute() static limit = 100;

      @attribute() title = '';
    }

    const ForkedMovie = Movie.fork();

    expect(ForkedMovie.limit).toBe(100);

    ForkedMovie.limit = 500;

    expect(ForkedMovie.limit).toBe(500);
    expect(Movie.limit).toBe(100);

    const movie = new Movie();

    const forkedMovie = movie.fork();

    expect(forkedMovie.title).toBe('');

    forkedMovie.title = 'Inception';

    expect(forkedMovie.title).toBe('Inception');
    expect(movie.title).toBe('');
  });

  test('Introspection', async () => {
    class Movie extends Component() {
      @attribute() static limit = 100;
      @attribute() static offset;
      @method() static find() {}

      @attribute() title = '';
      @attribute() country;
      @method() load() {}
    }

    const defaultTitle = Movie.prototype.getAttribute('title').getDefaultValueFunction();

    expect(typeof defaultTitle).toBe('function');

    expect(Movie.introspect()).toBeUndefined();

    Movie.getAttribute('limit').setExposure({get: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}]
    });

    Movie.getAttribute('limit').setExposure();
    Movie.prototype.getAttribute('title').setExposure({get: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      prototype: {
        properties: [
          {name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}}
        ]
      }
    });

    Movie.getAttribute('limit').setExposure({get: true});
    Movie.getAttribute('offset').setExposure({get: true});
    Movie.getMethod('find').setExposure({call: true});
    Movie.prototype.getAttribute('country').setExposure({get: true});
    Movie.prototype.getMethod('load').setExposure({call: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      properties: [
        {name: 'limit', type: 'attribute', value: 100, exposure: {get: true}},
        {name: 'offset', type: 'attribute', value: undefined, exposure: {get: true}},
        {name: 'find', type: 'method', exposure: {call: true}}
      ],
      prototype: {
        properties: [
          {name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}},
          {name: 'country', type: 'attribute', exposure: {get: true}},
          {name: 'load', type: 'method', exposure: {call: true}}
        ]
      }
    });
  });
});
