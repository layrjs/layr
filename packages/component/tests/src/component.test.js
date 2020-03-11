import {Component, isComponent, attribute, method} from '../../..';

describe('Component', () => {
  test('Creation', async () => {
    class Movie extends Component {
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

  test('Naming', async () => {
    class Movie extends Component {}

    expect(Movie.getComponentName()).toBe('Movie');

    Movie.setComponentName('Film');

    expect(Movie.getComponentName()).toBe('Film');

    Movie.setComponentName('MotionPicture');

    expect(Movie.getComponentName()).toBe('MotionPicture');

    // Make sure there are no enumerable properties
    expect(Object.keys(Movie)).toHaveLength(0);

    expect(() => Movie.setComponentName()).toThrow();
    expect(() => Movie.setComponentName(123)).toThrow();
    expect(() => Movie.setComponentName('')).toThrow('A component name cannot be empty');
    expect(() => Movie.setComponentName('1Place')).toThrow(
      "The specified component name ('1Place') is invalid"
    );
    expect(() => Movie.setComponentName('motionPicture')).toThrow(
      "The specified component name ('motionPicture') is invalid"
    );
    expect(() => Movie.setComponentName('MotionPicture!')).toThrow(
      "The specified component name ('MotionPicture!') is invalid"
    );
  });

  test('Related components', async () => {
    class Movie extends Component {}

    class Director extends Component {}

    class Actor extends Component {}

    expect(Movie.getRelatedComponent('Director', {throwIfMissing: false})).toBeUndefined();

    Movie.registerRelatedComponent(Director);
    Movie.registerRelatedComponent(Actor);

    expect(Movie.getRelatedComponent('Director')).toBe(Director);
    expect(Movie.getRelatedComponent('Actor')).toBe(Actor);
    expect(Movie.getRelatedComponent('Producer', {throwIfMissing: false})).toBeUndefined();
    expect(() => Movie.getRelatedComponent('Producer')).toThrow(
      "Cannot get the related component 'Producer'"
    );

    expect(
      Movie.prototype.getRelatedComponent('director', {throwIfMissing: false})
    ).toBeUndefined();

    Movie.prototype.registerRelatedComponent(Director.prototype);
    Movie.prototype.registerRelatedComponent(Actor.prototype);

    expect(Movie.prototype.getRelatedComponent('director')).toBe(Director.prototype);
    expect(Movie.prototype.getRelatedComponent('actor')).toBe(Actor.prototype);
    expect(
      Movie.prototype.getRelatedComponent('producer', {throwIfMissing: false})
    ).toBeUndefined();
    expect(() => Movie.prototype.getRelatedComponent('producer')).toThrow(
      "Cannot get the related component 'producer'"
    );
  });

  test('isNew mark', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    expect(movie.isNew()).toBe(true);

    movie.markAsNotNew();

    expect(movie.isNew()).toBe(false);

    movie.markAsNew();

    expect(movie.isNew()).toBe(true);
  });

  test('Introspection', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @attribute() static offset;
      @method() static find() {}

      @attribute() title = '';
      @attribute() country;
      @method() load() {}
    }

    class Cinema extends Component {
      @attribute() movies;
    }

    Cinema.prototype.registerRelatedComponent(Movie.prototype);

    const defaultTitle = Movie.prototype.getAttribute('title').getDefaultValueFunction();

    expect(typeof defaultTitle).toBe('function');

    expect(Movie.introspect()).toBeUndefined();

    Movie.getAttribute('limit').setExposure({get: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      type: 'Component',
      properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}]
    });

    Movie.getAttribute('limit').setExposure({get: true});
    Movie.getAttribute('offset').setExposure({get: true});
    Movie.getMethod('find').setExposure({call: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      type: 'Component',
      properties: [
        {name: 'limit', type: 'attribute', value: 100, exposure: {get: true}},
        {name: 'offset', type: 'attribute', value: undefined, exposure: {get: true}},
        {name: 'find', type: 'method', exposure: {call: true}}
      ]
    });

    expect(Movie.prototype.introspect()).toBeUndefined();

    expect(Cinema.prototype.introspect()).toBeUndefined();

    Cinema.prototype.getAttribute('movies').setExposure({get: true});

    expect(Cinema.prototype.introspect()).toStrictEqual({
      name: 'cinema',
      type: 'component',
      properties: [{name: 'movies', type: 'attribute', exposure: {get: true}}]
    });

    Movie.prototype.getAttribute('title').setExposure({get: true});

    expect(Movie.prototype.introspect()).toStrictEqual({
      name: 'movie',
      type: 'component',
      properties: [{name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}}]
    });

    expect(Cinema.prototype.introspect()).toStrictEqual({
      name: 'cinema',
      type: 'component',
      properties: [{name: 'movies', type: 'attribute', exposure: {get: true}}],
      relatedComponents: ['movie']
    });

    Movie.prototype.getAttribute('country').setExposure({get: true});
    Movie.prototype.getMethod('load').setExposure({call: true});

    expect(Movie.prototype.introspect()).toStrictEqual({
      name: 'movie',
      type: 'component',
      properties: [
        {name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}},
        {name: 'country', type: 'attribute', exposure: {get: true}},
        {name: 'load', type: 'method', exposure: {call: true}}
      ]
    });
  });

  test('Unintrospection', async () => {
    class UnintrospectedComponent extends Component {}

    UnintrospectedComponent.unintrospect({
      name: 'Movie',
      properties: [
        {name: 'limit', type: 'attribute', value: 100, exposure: {get: true}},
        {name: 'find', type: 'method', exposure: {call: true}}
      ]
    });

    expect(UnintrospectedComponent.getComponentName()).toBe('Movie');
    expect(UnintrospectedComponent.limit).toBe(100);
    expect(UnintrospectedComponent.getAttribute('limit').getExposure()).toStrictEqual({get: true});
    expect(UnintrospectedComponent.getMethod('find').getExposure()).toStrictEqual({call: true});

    const defaultTitle = function() {
      return '';
    };

    const unintrospectedComponent = UnintrospectedComponent.prototype;

    unintrospectedComponent.unintrospect({
      name: 'movie',
      properties: [{name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}}]
    });

    expect(unintrospectedComponent.getComponentName()).toBe('movie');
    expect(unintrospectedComponent.getAttribute('title').getDefaultValueFunction()).toBe(
      defaultTitle
    );
    expect(unintrospectedComponent.getAttribute('title').getExposure()).toStrictEqual({
      get: true
    });

    const movie = new UnintrospectedComponent();

    expect(movie.title).toBe('');
  });
});
