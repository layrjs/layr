import {Layer} from '@liaison/layer';

import {Component, isComponentClass, isComponentInstance, attribute, method} from '../../..';

describe('Component', () => {
  test('Creation', async () => {
    class Movie extends Component {
      @attribute() title = '';
      @attribute() country = '';

      instanceAttribute = true;
    }

    expect(isComponentClass(Movie)).toBe(true);

    // Make sure there are no enumerable properties in the class
    expect(Object.keys(Movie)).toHaveLength(0);

    let movie = new Movie();

    expect(isComponentInstance(movie)).toBe(true);
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

    // The component should be accessible through `getComponent()`
    expect(Movie.getComponent('Movie')).toBe(Movie);
    expect(Movie.getComponent('movie', {includePrototypes: true})).toBe(Movie.prototype);
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
      "Cannot get the related component class 'Producer'"
    );

    // Related components should also be accessible through `getComponent()`
    expect(Movie.getComponent('Director')).toBe(Director);
    expect(Movie.getComponent('director', {includePrototypes: true})).toBe(Director.prototype);
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

  test('Layer registration', async () => {
    const layer = new Layer();

    class Movie extends Component {}

    class Actor extends Component {}

    expect(Movie.getLayer({throwIfMissing: false})).toBeUndefined();
    expect(() => Movie.getLayer()).toThrow(
      "Cannot get the layer of a component that is not registered (component name: 'Movie')"
    );
    expect(Movie.prototype.getLayer({throwIfMissing: false})).toBeUndefined();
    expect(() => Movie.prototype.getLayer()).toThrow(
      "Cannot get the layer of a component that is not registered (component name: 'Movie')"
    );

    expect(Movie.hasLayer()).toBe(false);
    expect(Movie.prototype.hasLayer()).toBe(false);

    layer.registerComponent(Movie);

    expect(Movie.getLayer()).toBe(layer);
    expect(Movie.layer).toBe(layer);
    expect(Movie.prototype.getLayer()).toBe(layer);
    expect(Movie.prototype.layer).toBe(layer);

    expect(Movie.hasLayer()).toBe(true);
    expect(Movie.prototype.hasLayer()).toBe(true);

    expect(Movie.getComponent('Actor', {throwIfMissing: false})).toBeUndefined();

    layer.registerComponent(Actor);

    expect(Movie.getComponent('Actor')).toBe(Actor);
    expect(Movie.getComponent('actor', {includePrototypes: true})).toBe(Actor.prototype);
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

    Cinema.registerRelatedComponent(Movie);

    const defaultTitle = Movie.prototype.getAttribute('title').getDefaultValueFunction();

    expect(typeof defaultTitle).toBe('function');

    expect(Movie.introspect()).toBeUndefined();

    expect(Cinema.introspect()).toBeUndefined();

    Cinema.prototype.getAttribute('movies').setExposure({get: true});

    expect(Cinema.introspect()).toStrictEqual({
      name: 'Cinema',
      type: 'Component',
      prototype: {
        properties: [{name: 'movies', type: 'attribute', exposure: {get: true}}]
      }
    });

    Movie.getAttribute('limit').setExposure({get: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      type: 'Component',
      properties: [{name: 'limit', type: 'attribute', value: 100, exposure: {get: true}}]
    });

    expect(Cinema.introspect()).toStrictEqual({
      name: 'Cinema',
      type: 'Component',
      relatedComponents: ['Movie'],
      prototype: {
        properties: [{name: 'movies', type: 'attribute', exposure: {get: true}}]
      }
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

    Movie.prototype.getAttribute('title').setExposure({get: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      type: 'Component',
      properties: [
        {name: 'limit', type: 'attribute', value: 100, exposure: {get: true}},
        {name: 'offset', type: 'attribute', value: undefined, exposure: {get: true}},
        {name: 'find', type: 'method', exposure: {call: true}}
      ],
      prototype: {
        properties: [
          {name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}}
        ]
      }
    });

    Movie.prototype.getAttribute('country').setExposure({get: true});
    Movie.prototype.getMethod('load').setExposure({call: true});

    expect(Movie.introspect()).toStrictEqual({
      name: 'Movie',
      type: 'Component',
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

    UnintrospectedComponent.unintrospect({
      name: 'Movie',
      properties: [
        {name: 'limit', type: 'attribute', value: 100, exposure: {get: true}},
        {name: 'find', type: 'method', exposure: {call: true}}
      ],
      prototype: {
        properties: [
          {name: 'title', type: 'attribute', default: defaultTitle, exposure: {get: true}}
        ]
      }
    });

    expect(UnintrospectedComponent.prototype.getAttribute('title').getDefaultValueFunction()).toBe(
      defaultTitle
    );
    expect(UnintrospectedComponent.prototype.getAttribute('title').getExposure()).toStrictEqual({
      get: true
    });

    const movie = new UnintrospectedComponent();

    expect(movie.title).toBe('');
  });
});
