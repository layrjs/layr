import sleep from 'sleep-promise';

import {Component} from './component';
import {EmbeddedComponent} from './embedded-component';
import {
  isPropertyInstance,
  Attribute,
  isAttributeInstance,
  Method,
  isMethodInstance
} from './properties';
import {validators} from './validation';
import {attribute, method, expose, provide, consume} from './decorators';
import {isComponentClass, isComponentInstance} from './utilities';

describe('Component', () => {
  describe('Creation', () => {
    test('new ()', async () => {
      class Movie extends Component {
        static classAttribute = 1;

        instanceAttribute = 2;

        title!: string;
        country!: string;
      }

      Movie.prototype.setAttribute('title', {valueType: 'string', default: ''});
      Movie.prototype.setAttribute('country', {valueType: 'string', default: ''});

      expect(isComponentClass(Movie)).toBe(true);
      expect(Object.keys(Movie)).toEqual(['classAttribute']);
      expect(Movie.classAttribute).toBe(1);

      let movie = new Movie();

      expect(isComponentInstance(movie)).toBe(true);
      expect(movie).toBeInstanceOf(Movie);
      expect(Object.keys(movie)).toEqual(['instanceAttribute']);
      expect(movie.instanceAttribute).toBe(2);

      expect(movie.title).toBe('');
      expect(movie.country).toBe('');

      movie = new Movie({title: 'Inception'});

      expect(movie.title).toBe('Inception');
      expect(movie.country).toBe('');

      Movie.prototype.getAttribute('country').markAsControlled();

      movie = new Movie();

      expect(movie.title).toBe('');
      expect(movie.getAttribute('country').isSet()).toBe(false);
    });

    test('create()', async () => {
      class Movie extends Component {
        title!: string;
        country!: string;
      }

      Movie.prototype.setAttribute('title', {valueType: 'string', default: ''});
      Movie.prototype.setAttribute('country', {valueType: 'string', default: ''});

      let movie = Movie.create();

      expect(movie.isNew()).toBe(true);
      expect(movie.title).toBe('');
      expect(movie.country).toBe('');

      movie = Movie.create({}, {attributeSelector: {title: true}});

      expect(movie.isNew()).toBe(true);
      expect(movie.title).toBe('');
      expect(movie.getAttribute('country').isSet()).toBe(false);

      movie = Movie.create({title: 'Inception'}, {attributeSelector: {country: true}});

      expect(movie.isNew()).toBe(true);
      expect(movie.title).toBe('Inception');
      expect(movie.country).toBe('');

      movie = Movie.create({}, {isNew: false});

      expect(movie.isNew()).toBe(false);
      expect(movie.getAttribute('title').isSet()).toBe(false);
      expect(movie.getAttribute('country').isSet()).toBe(false);

      movie = Movie.create({title: 'Inception'}, {isNew: false});

      expect(movie.title).toBe('Inception');
      expect(movie.getAttribute('country').isSet()).toBe(false);

      expect(() =>
        Movie.create({title: 'Inception'}, {isNew: false, attributeSelector: {country: true}})
      ).toThrow(
        "Cannot assign a value of an unexpected type (component: 'Movie', attribute: 'country', expected type: 'string', received type: 'undefined')"
      );

      movie = await Movie.create(
        {title: 'Inception', country: 'USA'},
        {isNew: false, attributeFilter: async (attribute) => attribute.getName() !== 'country'}
      );

      expect(movie.title).toBe('Inception');
      expect(movie.getAttribute('country').isSet()).toBe(false);

      Movie.prototype.getAttribute('country').markAsControlled();

      movie = new Movie();

      expect(movie.title).toBe('');
      expect(movie.getAttribute('country').isSet()).toBe(false);
    });
  });

  describe('Initialization', () => {
    test('initialize()', async () => {
      class Movie extends Component {
        static isInitialized?: boolean;

        static initialize() {
          this.isInitialized = true;
        }

        isInitialized?: boolean;

        initialize() {
          this.isInitialized = true;
        }
      }

      expect(Movie.isInitialized).toBeUndefined();

      Movie.deserialize();

      expect(Movie.isInitialized).toBe(true);

      let movie = new Movie();

      expect(movie.isInitialized).toBeUndefined();

      movie.initialize();

      expect(movie.isInitialized).toBe(true);

      movie = Movie.create();

      expect(movie.isInitialized).toBe(true);

      movie = Movie.deserializeInstance() as Movie;

      expect(movie.isInitialized).toBe(true);

      movie.isInitialized = undefined;
      movie.deserialize();

      expect(movie.isInitialized).toBe(true);
    });

    test('async initialize()', async () => {
      class Movie extends Component {
        static isInitialized?: boolean;

        static async initialize() {
          await sleep(10);
          this.isInitialized = true;
        }

        isInitialized?: boolean;

        async initialize() {
          await sleep(10);
          this.isInitialized = true;
        }
      }

      expect(Movie.isInitialized).toBeUndefined();

      await Movie.deserialize();

      expect(Movie.isInitialized).toBe(true);

      let movie = new Movie();

      expect(movie.isInitialized).toBeUndefined();

      await movie.initialize();

      expect(movie.isInitialized).toBe(true);

      movie = await Movie.create();

      expect(movie.isInitialized).toBe(true);

      movie = await Movie.deserializeInstance();

      expect(movie.isInitialized).toBe(true);

      movie.isInitialized = undefined;
      await movie.deserialize();

      expect(movie.isInitialized).toBe(true);
    });
  });

  describe('Naming', () => {
    test('getComponentName() and setComponentName()', async () => {
      class Movie extends Component {}

      expect(Movie.getComponentName()).toBe('Movie');

      Movie.setComponentName('Film');

      expect(Movie.getComponentName()).toBe('Film');

      Movie.setComponentName('MotionPicture');

      expect(Movie.getComponentName()).toBe('MotionPicture');

      // Make sure there are no enumerable properties
      expect(Object.keys(Movie)).toHaveLength(0);

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

    test('getComponentPath()', async () => {
      class MovieDetails extends Component {}

      class Movie extends Component {
        @provide() static MovieDetails = MovieDetails;
      }

      class App extends Component {
        @provide() static Movie = Movie;
      }

      expect(App.getComponentPath()).toBe('App');
      expect(Movie.getComponentPath()).toBe('App.Movie');
      expect(MovieDetails.getComponentPath()).toBe('App.Movie.MovieDetails');
    });

    test('getComponentType()', async () => {
      class Movie extends Component {}

      expect(Movie.getComponentType()).toBe('typeof Movie');
      expect(Movie.prototype.getComponentType()).toBe('Movie');

      Movie.setComponentName('Film');

      expect(Movie.getComponentType()).toBe('typeof Film');
      expect(Movie.prototype.getComponentType()).toBe('Film');
    });
  });

  describe('isNew mark', () => {
    test('isNew(), markAsNew(), and markAsNotNew()', async () => {
      class Movie extends Component {}

      const movie = new Movie();

      expect(movie.isNew()).toBe(true);

      movie.markAsNotNew();

      expect(movie.isNew()).toBe(false);

      movie.markAsNew();

      expect(movie.isNew()).toBe(true);
    });
  });

  describe('Properties', () => {
    test('getProperty()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;

        @method() static find() {}

        @attribute() title = '';
      }

      let property = Movie.getProperty('limit');

      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('limit');
      expect(property.getParent()).toBe(Movie);

      property = Movie.getProperty('find');

      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('find');
      expect(property.getParent()).toBe(Movie);

      class Film extends Movie {}

      property = Film.getProperty('limit');

      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('limit');
      expect(property.getParent()).toBe(Film);

      property = Film.getProperty('find');

      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('find');
      expect(property.getParent()).toBe(Film);

      const movie = new Movie();

      property = movie.getProperty('title');

      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('title');
      expect(property.getParent()).toBe(movie);

      const film = new Film();

      property = film.getProperty('title');

      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('title');
      expect(property.getParent()).toBe(film);

      expect(Movie.hasProperty('offset')).toBe(false);
      expect(() => Movie.getProperty('offset')).toThrow(
        "The property 'offset' is missing (component: 'Movie')"
      );
    });

    test('hasProperty()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;

        @method() static find() {}
      }

      expect(Movie.hasProperty('limit')).toBe(true);
      expect(Movie.hasProperty('find')).toBe(true);
      expect(Movie.hasProperty('offset')).toBe(false);
      expect(Movie.prototype.hasProperty('limit')).toBe(false);
    });

    test('setProperty()', async () => {
      class Movie extends Component {}

      expect(Movie.hasProperty('limit')).toBe(false);

      let setPropertyResult: any = Movie.setProperty('limit', Attribute);

      expect(Movie.hasProperty('limit')).toBe(true);

      let property = Movie.getProperty('limit');

      expect(property).toBe(setPropertyResult);
      expect(isPropertyInstance(property)).toBe(true);
      expect(isAttributeInstance(property)).toBe(true);
      expect(property.getName()).toBe('limit');
      expect(property.getParent()).toBe(Movie);

      expect(Movie.hasProperty('find')).toBe(false);

      setPropertyResult = Movie.setProperty('find', Method);

      expect(Movie.hasProperty('find')).toBe(true);

      property = Movie.getProperty('find');

      expect(property).toBe(setPropertyResult);
      expect(isPropertyInstance(property)).toBe(true);
      expect(isMethodInstance(property)).toBe(true);
      expect(property.getName()).toBe('find');
      expect(property.getParent()).toBe(Movie);

      class Film extends Movie {}

      expect(Film.hasProperty('limit')).toBe(true);

      setPropertyResult = Film.setProperty('limit', Attribute);

      expect(Film.hasProperty('limit')).toBe(true);

      property = Film.getProperty('limit');

      expect(property).toBe(setPropertyResult);
      expect(isPropertyInstance(property)).toBe(true);
      expect(property.getName()).toBe('limit');
      expect(property.getParent()).toBe(Film);
    });

    test('getProperties()', async () => {
      class Movie extends Component {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      const movie = new Movie();

      let properties = movie.getProperties();

      expect(typeof properties[Symbol.iterator]).toBe('function');
      expect(Array.from(properties).map((property) => property.getName())).toEqual([
        'title',
        'duration',
        'load',
        'save'
      ]);

      const classProperties = Movie.getProperties();

      expect(typeof classProperties[Symbol.iterator]).toBe('function');
      expect(Array.from(classProperties)).toHaveLength(0);

      class Film extends Movie {
        @attribute() director?: {name: string};
      }

      const film = new Film();

      properties = film.getProperties();

      expect(typeof properties[Symbol.iterator]).toBe('function');
      expect(Array.from(properties).map((property) => property.getName())).toEqual([
        'title',
        'duration',
        'load',
        'save',
        'director'
      ]);

      properties = film.getProperties({
        filter(property) {
          expect(property.getParent() === this);
          return property.getName() !== 'duration';
        }
      });

      expect(typeof properties[Symbol.iterator]).toBe('function');
      expect(Array.from(properties).map((property) => property.getName())).toEqual([
        'title',
        'load',
        'save',
        'director'
      ]);
    });

    test('getPropertyNames()', async () => {
      class Movie extends Component {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      expect(Movie.getPropertyNames()).toHaveLength(0);

      expect(Movie.prototype.getPropertyNames()).toEqual(['title', 'duration', 'load', 'save']);

      const movie = new Movie();

      expect(movie.getPropertyNames()).toEqual(['title', 'duration', 'load', 'save']);

      class Film extends Movie {
        @attribute() director?: {name: string};
      }

      const film = new Film();

      expect(film.getPropertyNames()).toEqual(['title', 'duration', 'load', 'save', 'director']);
    });
  });

  describe('Attributes', () => {
    test('getAttribute()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;

        @method() static find() {}

        @attribute() title = '';
      }

      let attr = Movie.getAttribute('limit');

      expect(isAttributeInstance(attr)).toBe(true);
      expect(attr.getName()).toBe('limit');
      expect(attr.getParent()).toBe(Movie);

      expect(() => Movie.getAttribute('find')).toThrow(
        "A property with the specified name was found, but it is not an attribute (component: 'Movie', method: 'find')"
      );

      class Film extends Movie {}

      attr = Film.getAttribute('limit');

      expect(isAttributeInstance(attr)).toBe(true);
      expect(attr.getName()).toBe('limit');
      expect(attr.getParent()).toBe(Film);

      const movie = new Movie();

      const instanceAttribute = movie.getAttribute('title');

      expect(isAttributeInstance(instanceAttribute)).toBe(true);
      expect(instanceAttribute.getName()).toBe('title');
      expect(instanceAttribute.getParent()).toBe(movie);

      const film = new Film();

      attr = film.getAttribute('title');

      expect(isAttributeInstance(attr)).toBe(true);
      expect(attr.getName()).toBe('title');
      expect(attr.getParent()).toBe(film);

      expect(Movie.hasAttribute('offset')).toBe(false);
      expect(() => Movie.getAttribute('offset')).toThrow(
        "The attribute 'offset' is missing (component: 'Movie')"
      );
    });

    test('hasAttribute()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;

        @method() static find() {}
      }

      expect(Movie.hasAttribute('limit')).toBe(true);
      expect(Movie.hasAttribute('offset')).toBe(false);
      expect(Movie.prototype.hasAttribute('limit')).toBe(false);

      expect(() => Movie.hasAttribute('find')).toThrow(
        "A property with the specified name was found, but it is not an attribute (component: 'Movie', method: 'find')"
      );
    });

    test('setAttribute()', async () => {
      class Movie extends Component {
        @method() static find() {}
      }

      expect(Movie.hasAttribute('limit')).toBe(false);

      let setAttributeResult = Movie.setAttribute('limit');

      expect(Movie.hasAttribute('limit')).toBe(true);

      let attr = Movie.getAttribute('limit');

      expect(attr).toBe(setAttributeResult);
      expect(isAttributeInstance(attr)).toBe(true);
      expect(attr.getName()).toBe('limit');
      expect(attr.getParent()).toBe(Movie);

      expect(() => Movie.setAttribute('find')).toThrow(
        "Cannot change the type of a property (component: 'Movie', method: 'find')"
      );

      class Film extends Movie {}

      expect(Film.hasAttribute('limit')).toBe(true);

      setAttributeResult = Film.setAttribute('limit');

      expect(Film.hasAttribute('limit')).toBe(true);

      attr = Film.getAttribute('limit');

      expect(attr).toBe(setAttributeResult);
      expect(isAttributeInstance(attr)).toBe(true);
      expect(attr.getName()).toBe('limit');
      expect(attr.getParent()).toBe(Film);

      expect(() => Film.setAttribute('find')).toThrow(
        "Cannot change the type of a property (component: 'Film', method: 'find')"
      );
    });

    test('getAttributes()', async () => {
      class Movie extends Component {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      const movie = new Movie();

      let attributes = movie.getAttributes();

      expect(typeof attributes[Symbol.iterator]).toBe('function');

      expect(Array.from(attributes).map((property) => property.getName())).toEqual([
        'title',
        'duration'
      ]);

      attributes = Movie.getAttributes();

      expect(typeof attributes[Symbol.iterator]).toBe('function');
      expect(Array.from(attributes)).toHaveLength(0);

      class Film extends Movie {
        @attribute() director?: string;
      }

      const film = Film.create({title: 'Inception', director: 'Christopher Nolan'}, {isNew: false});

      attributes = film.getAttributes();

      expect(Array.from(attributes).map((property) => property.getName())).toEqual([
        'title',
        'duration',
        'director'
      ]);

      attributes = film.getAttributes({attributeSelector: {title: true, director: true}});

      expect(Array.from(attributes).map((property) => property.getName())).toEqual([
        'title',
        'director'
      ]);

      attributes = film.getAttributes({setAttributesOnly: true});

      expect(Array.from(attributes).map((property) => property.getName())).toEqual([
        'title',
        'director'
      ]);

      attributes = film.getAttributes({
        filter(property) {
          expect(property.getParent() === this);
          return property.getName() !== 'duration';
        }
      });

      expect(Array.from(attributes).map((property) => property.getName())).toEqual([
        'title',
        'director'
      ]);
    });

    test('getAttributeSelector()', async () => {
      class Movie extends Component {
        @attribute() title = '';
        @attribute() duration = 0;
      }

      expect(Movie.prototype.getAttributeSelector()).toStrictEqual({
        title: true,
        duration: true
      });

      expect(Movie.prototype.getAttributeSelector({setAttributesOnly: true})).toStrictEqual({});

      const movie = Movie.create({}, {isNew: false});

      expect(movie.getAttributeSelector()).toStrictEqual({
        title: true,
        duration: true
      });

      expect(movie.getAttributeSelector({setAttributesOnly: true})).toStrictEqual({});

      movie.title = 'Inception';

      expect(movie.getAttributeSelector({setAttributesOnly: true})).toStrictEqual({title: true});

      movie.duration = 120;

      expect(movie.getAttributeSelector({setAttributesOnly: true})).toStrictEqual({
        title: true,
        duration: true
      });
    });

    test('expandAttributeSelector()', async () => {
      class Person extends EmbeddedComponent {
        @attribute('string') name = '';
      }

      class Movie extends Component {
        @provide() static Person = Person;

        @attribute('string') title = '';
        @attribute('number') duration = 0;
        @attribute('Person?') director?: Person;
        @attribute('Person[]') actors: Person[] = [];
      }

      expect(Movie.prototype.expandAttributeSelector(true)).toStrictEqual({
        title: true,
        duration: true,
        director: {name: true},
        actors: {name: true}
      });

      expect(Movie.prototype.expandAttributeSelector(false)).toStrictEqual({});

      expect(Movie.prototype.expandAttributeSelector({})).toStrictEqual({});

      expect(Movie.prototype.expandAttributeSelector({title: true, director: true})).toStrictEqual({
        title: true,
        director: {name: true}
      });

      expect(Movie.prototype.expandAttributeSelector({title: true, director: false})).toStrictEqual(
        {
          title: true
        }
      );

      expect(Movie.prototype.expandAttributeSelector({title: true, director: {}})).toStrictEqual({
        title: true,
        director: {}
      });

      expect(Movie.prototype.expandAttributeSelector(true, {depth: 0})).toStrictEqual({
        title: true,
        duration: true,
        director: true,
        actors: true
      });

      expect(
        Movie.prototype.expandAttributeSelector({title: true, actors: true}, {depth: 0})
      ).toStrictEqual({title: true, actors: true});
    });

    test('Validation', async () => {
      const notEmpty = validators.notEmpty();
      const maxLength = validators.maxLength(3);

      class Person extends EmbeddedComponent {
        @attribute('string', {validators: [notEmpty]}) name = '';
        @attribute('string?') country?: string;
      }

      class Movie extends Component {
        @provide() static Person = Person;

        @attribute('string', {validators: [notEmpty]}) title = '';
        @attribute('string[]', {
          validators: [maxLength],
          items: {validators: [notEmpty]}
        })
        tags: string[] = [];
        @attribute('Person?') director?: Person;
        @attribute('Person[]') actors: Person[] = [];
      }

      const movie = new Movie();

      expect(() => movie.validate()).toThrow(
        "The following error(s) occurred while validating the component 'Movie': The validator `notEmpty()` failed (path: 'title')"
      );
      expect(movie.isValid()).toBe(false);
      expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'title'}]);
      expect(movie.runValidators({title: true})).toEqual([{validator: notEmpty, path: 'title'}]);
      expect(movie.runValidators({tags: true})).toEqual([]);

      movie.title = 'Inception';

      expect(() => movie.validate()).not.toThrow();
      expect(movie.isValid()).toBe(true);
      expect(movie.runValidators()).toEqual([]);

      movie.tags = ['action'];

      expect(() => movie.validate()).not.toThrow();
      expect(movie.isValid()).toBe(true);
      expect(movie.runValidators()).toEqual([]);

      movie.tags.push('adventure');

      expect(() => movie.validate()).not.toThrow();
      expect(movie.isValid()).toBe(true);
      expect(movie.runValidators()).toEqual([]);

      movie.tags.push('');

      expect(() => movie.validate()).toThrow(
        "The following error(s) occurred while validating the component 'Movie': The validator `notEmpty()` failed (path: 'tags[2]')"
      );
      expect(movie.isValid()).toBe(false);
      expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'tags[2]'}]);
      expect(movie.runValidators({tags: true})).toEqual([{validator: notEmpty, path: 'tags[2]'}]);
      expect(movie.runValidators({title: true})).toEqual([]);

      movie.tags.push('sci-fi');

      expect(() => movie.validate()).toThrow(
        "The following error(s) occurred while validating the component 'Movie': The validator `maxLength(3)` failed (path: 'tags'), The validator `notEmpty()` failed (path: 'tags[2]')"
      );
      expect(movie.isValid()).toBe(false);
      expect(movie.runValidators()).toEqual([
        {validator: maxLength, path: 'tags'},
        {validator: notEmpty, path: 'tags[2]'}
      ]);

      movie.tags.splice(2, 1);

      movie.director = new Person();

      expect(() => movie.validate()).toThrow(
        "The following error(s) occurred while validating the component 'Movie': The validator `notEmpty()` failed (path: 'director.name')"
      );
      expect(movie.isValid()).toBe(false);
      expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'director.name'}]);
      expect(movie.runValidators({director: {name: true}})).toEqual([
        {validator: notEmpty, path: 'director.name'}
      ]);
      expect(movie.runValidators({director: {country: true}})).toEqual([]);

      movie.director.name = 'Christopher Nolan';

      expect(() => movie.validate()).not.toThrow();
      expect(movie.isValid()).toBe(true);
      expect(movie.runValidators()).toEqual([]);

      movie.actors.push(new Person());

      expect(() => movie.validate()).toThrow(
        "The following error(s) occurred while validating the component 'Movie': The validator `notEmpty()` failed (path: 'actors[0].name')"
      );
      expect(movie.isValid()).toBe(false);
      expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'actors[0].name'}]);

      movie.actors[0].name = 'Leonardo DiCaprio';

      expect(() => movie.validate()).not.toThrow();
      expect(movie.isValid()).toBe(true);
      expect(movie.runValidators()).toEqual([]);
    });
  });

  describe('Methods', () => {
    test('getMethod()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;

        @method() static find() {}

        @method() load() {}
      }

      let meth = Movie.getMethod('find');

      expect(isMethodInstance(meth)).toBe(true);
      expect(meth.getName()).toBe('find');
      expect(meth.getParent()).toBe(Movie);

      expect(() => Movie.getMethod('limit')).toThrow(
        "A property with the specified name was found, but it is not a method (component: 'Movie', attribute: 'limit')"
      );

      class Film extends Movie {}

      meth = Film.getMethod('find');

      expect(isMethodInstance(meth)).toBe(true);
      expect(meth.getName()).toBe('find');
      expect(meth.getParent()).toBe(Film);

      const movie = new Movie();

      meth = movie.getMethod('load');

      expect(isMethodInstance(meth)).toBe(true);
      expect(meth.getName()).toBe('load');
      expect(meth.getParent()).toBe(movie);

      const film = new Film();

      meth = film.getMethod('load');

      expect(isMethodInstance(meth)).toBe(true);
      expect(meth.getName()).toBe('load');
      expect(meth.getParent()).toBe(film);

      expect(Movie.hasMethod('load')).toBe(false);
      expect(() => Movie.getMethod('load')).toThrow(
        "The method 'load' is missing (component: 'Movie')"
      );
    });

    test('hasMethod()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;

        @method() static find() {}
      }

      expect(Movie.hasMethod('find')).toBe(true);
      expect(Movie.hasMethod('load')).toBe(false);
      expect(Movie.prototype.hasMethod('find')).toBe(false);

      expect(() => Movie.hasMethod('limit')).toThrow(
        "A property with the specified name was found, but it is not a method (component: 'Movie', attribute: 'limit')"
      );
    });

    test('setMethod()', async () => {
      class Movie extends Component {
        @attribute() static limit = 100;
      }

      expect(Movie.hasMethod('find')).toBe(false);

      let setMethodResult = Movie.setMethod('find');

      expect(Movie.hasMethod('find')).toBe(true);

      let meth = Movie.getMethod('find');

      expect(meth).toBe(setMethodResult);
      expect(isMethodInstance(meth)).toBe(true);
      expect(meth.getName()).toBe('find');
      expect(meth.getParent()).toBe(Movie);

      expect(() => Movie.setMethod('limit')).toThrow(
        "Cannot change the type of a property (component: 'Movie', attribute: 'limit')"
      );

      class Film extends Movie {}

      expect(Film.hasMethod('find')).toBe(true);

      setMethodResult = Film.setMethod('find');

      expect(Film.hasMethod('find')).toBe(true);

      meth = Film.getMethod('find');

      expect(meth).toBe(setMethodResult);
      expect(isMethodInstance(meth)).toBe(true);
      expect(meth.getName()).toBe('find');
      expect(meth.getParent()).toBe(Film);

      expect(() => Film.setMethod('limit')).toThrow(
        "Cannot change the type of a property (component: 'Film', attribute: 'limit')"
      );
    });

    test('getMethods()', async () => {
      class Movie extends Component {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      const movie = new Movie();

      let methods = movie.getMethods();

      expect(typeof methods[Symbol.iterator]).toBe('function');
      expect(Array.from(methods).map((property) => property.getName())).toEqual(['load', 'save']);

      methods = Movie.getMethods();

      expect(typeof methods[Symbol.iterator]).toBe('function');
      expect(Array.from(methods)).toHaveLength(0);

      class Film extends Movie {
        @method() delete() {}
      }

      const film = new Film();

      methods = film.getMethods();

      expect(typeof methods[Symbol.iterator]).toBe('function');
      expect(Array.from(methods).map((property) => property.getName())).toEqual([
        'load',
        'save',
        'delete'
      ]);

      methods = film.getMethods({
        filter(property) {
          expect(property.getParent() === this);
          return property.getName() !== 'save';
        }
      });

      expect(typeof methods[Symbol.iterator]).toBe('function');
      expect(Array.from(methods).map((property) => property.getName())).toEqual(['load', 'delete']);
    });
  });

  describe('Dependency management', () => {
    test('Component getters', async () => {
      class Movie extends Component {
        @consume() static Director: typeof Director;
      }

      class Director extends Component {
        @consume() static Movie: typeof Movie;
      }

      class App extends Component {
        @provide() static Movie = Movie;
        @provide() static Director = Director;
      }

      expect(App.getComponent('App')).toBe(App);
      expect(App.getComponent('Movie')).toBe(Movie);
      expect(App.getComponent('Director')).toBe(Director);
      expect(Movie.getComponent('Director')).toBe(Director);
      expect(Director.getComponent('Movie')).toBe(Movie);

      expect(App.hasComponent('Movie')).toBe(true);
      expect(App.hasComponent('Producer')).toBe(false);
      expect(() => App.getComponent('Producer')).toThrow(
        "Cannot get the component 'Producer' from the component 'App'"
      );

      expect(App.getComponentOfType('typeof Movie')).toBe(Movie);
      expect(App.getComponentOfType('Movie')).toBe(Movie.prototype);

      expect(App.hasComponentOfType('typeof Movie')).toBe(true);
      expect(App.hasComponentOfType('Movie')).toBe(true);
      expect(App.hasComponentOfType('typeof Producer')).toBe(false);
      expect(App.hasComponentOfType('Producer')).toBe(false);
      expect(() => App.getComponentOfType('typeof Producer')).toThrow(
        "Cannot get the component of type 'typeof Producer' from the component 'App'"
      );
    });

    test('Component provision', async () => {
      class Movie extends Component {
        static Director: typeof Director;
        static Actor: typeof Actor;
        static Producer: typeof Producer;
      }

      class Director extends Component {}

      class Actor extends Component {}

      class Producer extends Component {}

      expect(Movie.getProvidedComponent('Director')).toBeUndefined();
      expect(Movie.getProvidedComponent('Actor')).toBeUndefined();
      expect(Movie.getProvidedComponent('Producer')).toBeUndefined();

      expect(Movie.getComponentProvider()).toBe(Movie);
      expect(Director.getComponentProvider()).toBe(Director);
      expect(Actor.getComponentProvider()).toBe(Actor);

      Movie.provideComponent(Director);
      Movie.provideComponent(Actor);

      // Providing the same component a second time should have no effects
      Movie.provideComponent(Director);

      expect(Movie.getProvidedComponent('Director')).toBe(Director);
      expect(Movie.getProvidedComponent('Actor')).toBe(Actor);
      expect(Movie.getProvidedComponent('Producer')).toBeUndefined();

      // Provided components should also be accessible through component accessors
      expect(Movie.Director).toBe(Director);
      expect(Movie.Actor).toBe(Actor);
      expect(Movie.Producer).toBe(undefined);

      // And through `getComponent()`
      expect(Movie.getComponent('Director')).toBe(Director);
      expect(Movie.getComponent('Actor')).toBe(Actor);
      expect(Movie.hasComponent('Producer')).toBe(false);

      // It should be possible to get the component provider of a provided component
      expect(Director.getComponent('Movie')).toBe(Movie);

      expect(Array.from(Movie.getProvidedComponents())).toEqual([Director, Actor]);

      expect(Movie.getComponentProvider()).toBe(Movie);
      expect(Director.getComponentProvider()).toBe(Movie);
      expect(Actor.getComponentProvider()).toBe(Movie);

      const ForkedMovie = Movie.fork();

      const ForkedDirector = ForkedMovie.Director;

      expect(ForkedDirector?.isForkOf(Director)).toBe(true);
      expect(ForkedDirector).not.toBe(Director);

      const SameForkedDirector = ForkedMovie.Director;

      expect(SameForkedDirector).toBe(ForkedDirector);

      expect(ForkedDirector.getComponentProvider()).toBe(ForkedMovie);

      class Root extends Component {}

      Root.provideComponent(Movie);

      expect(Array.from(Root.getProvidedComponents())).toEqual([Movie]);
      expect(Array.from(Root.getProvidedComponents({deep: true}))).toEqual([
        Movie,
        Director,
        Actor
      ]);

      class Film extends Component {}

      expect(() => Film.provideComponent(Director)).toThrow(
        "Cannot provide the component 'Director' from 'Film' because 'Director' is already provided by 'Movie'"
      );

      class OtherComponent extends Component {}

      OtherComponent.setComponentName('Director');

      expect(() => Movie.provideComponent(OtherComponent)).toThrow(
        "Cannot provide the component 'Director' from 'Movie' because a component with the same name is already provided"
      );

      (Movie as any).Producer = {};

      expect(() => Movie.provideComponent(Producer)).toThrow(
        "Cannot provide the component 'Producer' from 'Movie' because there is an existing property with the same name"
      );
    });

    test('Component consumption', async () => {
      class Movie extends Component {
        static Director: typeof Director;
        static Producer: typeof Producer;
      }

      class Director extends Component {
        static Movie: typeof Movie;
      }

      class Producer extends Component {}

      class App extends Component {
        @provide() static Movie = Movie;
        @provide() static Director = Director;
        static Producer: typeof Producer;
      }

      expect(Movie.getConsumedComponent('Director')).toBeUndefined();
      expect(Director.getConsumedComponent('Movie')).toBeUndefined();
      expect(Movie.getConsumedComponent('Producer')).toBeUndefined();

      expect(Movie.getComponentProvider()).toBe(App);
      expect(Director.getComponentProvider()).toBe(App);

      Movie.consumeComponent('Director');
      Director.consumeComponent('Movie');

      // Consuming the same component a second time should have no effects
      Movie.consumeComponent('Director');

      expect(Movie.getConsumedComponent('Director')).toBe(Director);
      expect(Director.getConsumedComponent('Movie')).toBe(Movie);
      expect(Movie.getConsumedComponent('Producer')).toBeUndefined();

      // Consumed components should also be accessible through component accessors
      expect(Movie.Director).toBe(Director);
      expect(Director.Movie).toBe(Movie);
      expect(Movie.Producer).toBe(undefined);

      // And through `getComponent()`
      expect(Movie.getComponent('Director')).toBe(Director);
      expect(Director.getComponent('Movie')).toBe(Movie);
      expect(Movie.hasComponent('Producer')).toBe(false);

      expect(Array.from(Movie.getConsumedComponents())).toEqual([Director]);
      expect(Array.from(Director.getConsumedComponents())).toEqual([Movie]);

      const ForkedApp = App.fork();

      const ForkedMovie = ForkedApp.Movie;
      const ForkedDirector = ForkedApp.Director;

      expect(ForkedMovie?.isForkOf(Movie)).toBe(true);
      expect(ForkedMovie).not.toBe(Movie);
      expect(ForkedDirector?.isForkOf(Director)).toBe(true);
      expect(ForkedDirector).not.toBe(Director);

      const SameForkedMovie = ForkedApp.Movie;
      const SameForkedDirector = ForkedApp.Director;

      expect(SameForkedMovie).toBe(ForkedMovie);
      expect(SameForkedDirector).toBe(ForkedDirector);

      expect(ForkedMovie.Director).toBe(ForkedDirector);
      expect(ForkedDirector.Movie).toBe(ForkedMovie);

      expect(ForkedMovie.getComponentProvider()).toBe(ForkedApp);
      expect(ForkedDirector.getComponentProvider()).toBe(ForkedApp);

      (Movie as any).Producer = Producer;

      expect(() => Movie.consumeComponent('Producer')).toThrow(
        "Cannot consume the component 'Producer' from 'Movie' because there is an existing property with the same name"
      );
    });
  });

  describe('Attachment', () => {
    test('attach(), detach(), isAttached(), and isDetached()', async () => {
      class Movie extends Component {}

      class App extends Component {
        @provide() static Movie = Movie;
      }

      const movie = new Movie();
      const otherMovie = new Movie();

      expect(App.isAttached()).toBe(true);
      expect(Movie.isAttached()).toBe(true);
      expect(movie.isAttached()).toBe(true);
      expect(otherMovie.isAttached()).toBe(true);
      expect(App.isDetached()).toBe(false);
      expect(Movie.isDetached()).toBe(false);
      expect(movie.isDetached()).toBe(false);
      expect(otherMovie.isDetached()).toBe(false);

      App.detach();

      expect(App.isAttached()).toBe(false);
      expect(Movie.isAttached()).toBe(false);
      expect(movie.isAttached()).toBe(false);
      expect(otherMovie.isAttached()).toBe(false);
      expect(App.isDetached()).toBe(true);
      expect(Movie.isDetached()).toBe(true);
      expect(movie.isDetached()).toBe(true);
      expect(otherMovie.isDetached()).toBe(true);

      App.attach();

      expect(App.isAttached()).toBe(true);
      expect(Movie.isAttached()).toBe(true);
      expect(movie.isAttached()).toBe(true);
      expect(otherMovie.isAttached()).toBe(true);
      expect(App.isDetached()).toBe(false);
      expect(Movie.isDetached()).toBe(false);
      expect(movie.isDetached()).toBe(false);
      expect(otherMovie.isDetached()).toBe(false);

      Movie.detach();

      expect(App.isAttached()).toBe(true);
      expect(Movie.isAttached()).toBe(false);
      expect(movie.isAttached()).toBe(false);
      expect(otherMovie.isAttached()).toBe(false);
      expect(App.isDetached()).toBe(false);
      expect(Movie.isDetached()).toBe(true);
      expect(movie.isDetached()).toBe(true);
      expect(otherMovie.isDetached()).toBe(true);

      Movie.attach();

      expect(App.isAttached()).toBe(true);
      expect(Movie.isAttached()).toBe(true);
      expect(movie.isAttached()).toBe(true);
      expect(otherMovie.isAttached()).toBe(true);
      expect(App.isDetached()).toBe(false);
      expect(Movie.isDetached()).toBe(false);
      expect(movie.isDetached()).toBe(false);
      expect(otherMovie.isDetached()).toBe(false);

      movie.detach();

      expect(App.isAttached()).toBe(true);
      expect(Movie.isAttached()).toBe(true);
      expect(movie.isAttached()).toBe(false);
      expect(otherMovie.isAttached()).toBe(true);
      expect(App.isDetached()).toBe(false);
      expect(Movie.isDetached()).toBe(false);
      expect(movie.isDetached()).toBe(true);
      expect(otherMovie.isDetached()).toBe(false);

      movie.attach();

      expect(App.isAttached()).toBe(true);
      expect(Movie.isAttached()).toBe(true);
      expect(movie.isAttached()).toBe(true);
      expect(otherMovie.isAttached()).toBe(true);
      expect(App.isDetached()).toBe(false);
      expect(Movie.isDetached()).toBe(false);
      expect(movie.isDetached()).toBe(false);
      expect(otherMovie.isDetached()).toBe(false);

      App.detach();

      // Since Movie and movie has been explicitly attached,
      // they should remain so even though App is detached
      expect(App.isAttached()).toBe(false);
      expect(Movie.isAttached()).toBe(true);
      expect(movie.isAttached()).toBe(true);
      expect(otherMovie.isAttached()).toBe(true);
      expect(App.isDetached()).toBe(true);
      expect(Movie.isDetached()).toBe(false);
      expect(movie.isDetached()).toBe(false);
      expect(otherMovie.isDetached()).toBe(false);
    });
  });

  describe('Introspection', () => {
    test('introspect()', async () => {
      class Movie extends Component {
        @consume() static Cinema: typeof Cinema;

        @attribute('number') static limit = 100;
        @attribute('number?') static offset?: number;
        @method() static find() {}

        @attribute('string') title = '';
        @attribute('string?') country?: string;
        @method() load() {}
      }

      class Cinema extends Component {
        @provide() static Movie = Movie;

        @attribute('Movie[]?') movies?: Movie[];
      }

      const defaultTitle = Movie.prototype.getAttribute('title').getDefault();

      expect(typeof defaultTitle).toBe('function');

      expect(Movie.introspect()).toBeUndefined();

      expect(Cinema.introspect()).toBeUndefined();

      Cinema.prototype.getAttribute('movies').setExposure({get: true});

      expect(Cinema.introspect()).toStrictEqual({
        name: 'Cinema',
        prototype: {
          properties: [
            {name: 'movies', type: 'Attribute', valueType: 'Movie[]?', exposure: {get: true}}
          ]
        }
      });

      Movie.getAttribute('limit').setExposure({get: true});

      expect(Movie.introspect()).toStrictEqual({
        name: 'Movie',
        properties: [
          {name: 'limit', type: 'Attribute', valueType: 'number', value: 100, exposure: {get: true}}
        ],
        consumedComponents: ['Cinema']
      });

      expect(Cinema.introspect()).toStrictEqual({
        name: 'Cinema',
        prototype: {
          properties: [
            {name: 'movies', type: 'Attribute', valueType: 'Movie[]?', exposure: {get: true}}
          ]
        },
        providedComponents: [
          {
            name: 'Movie',
            properties: [
              {
                name: 'limit',
                type: 'Attribute',
                valueType: 'number',
                value: 100,
                exposure: {get: true}
              }
            ],
            consumedComponents: ['Cinema']
          }
        ]
      });

      Movie.getAttribute('limit').setExposure({get: true});
      Movie.getAttribute('offset').setExposure({get: true});
      Movie.getMethod('find').setExposure({call: true});

      expect(Movie.introspect()).toStrictEqual({
        name: 'Movie',
        properties: [
          {
            name: 'limit',
            type: 'Attribute',
            valueType: 'number',
            value: 100,
            exposure: {get: true}
          },
          {
            name: 'offset',
            type: 'Attribute',
            valueType: 'number?',
            value: undefined,
            exposure: {get: true}
          },
          {name: 'find', type: 'Method', exposure: {call: true}}
        ],
        consumedComponents: ['Cinema']
      });

      Movie.prototype.getAttribute('title').setExposure({get: true, set: true});
      Movie.prototype.getAttribute('country').setExposure({get: true});
      Movie.prototype.getMethod('load').setExposure({call: true});

      expect(Movie.introspect()).toStrictEqual({
        name: 'Movie',
        properties: [
          {
            name: 'limit',
            type: 'Attribute',
            valueType: 'number',
            value: 100,
            exposure: {get: true}
          },
          {
            name: 'offset',
            type: 'Attribute',
            valueType: 'number?',
            value: undefined,
            exposure: {get: true}
          },
          {name: 'find', type: 'Method', exposure: {call: true}}
        ],
        prototype: {
          properties: [
            {
              name: 'title',
              type: 'Attribute',
              valueType: 'string',
              default: defaultTitle,
              exposure: {get: true, set: true}
            },
            {name: 'country', type: 'Attribute', valueType: 'string?', exposure: {get: true}},
            {name: 'load', type: 'Method', exposure: {call: true}}
          ]
        },
        consumedComponents: ['Cinema']
      });

      // --- With a mixin ---

      const Storable = (Base = Component) => {
        const _Storable = class extends Base {};

        Object.defineProperty(_Storable, '__mixin', {value: 'Storable'});

        return _Storable;
      };

      class Film extends Storable(Component) {
        @expose({get: true, set: true}) @attribute('string?') title?: string;
      }

      expect(Film.introspect()).toStrictEqual({
        name: 'Film',
        mixins: ['Storable'],
        prototype: {
          properties: [
            {
              name: 'title',
              type: 'Attribute',
              valueType: 'string?',
              exposure: {get: true, set: true}
            }
          ]
        }
      });
    });

    test('unintrospect()', async () => {
      const defaultTitle = function () {
        return '';
      };

      const Cinema = Component.unintrospect({
        name: 'Cinema',
        prototype: {
          properties: [
            {name: 'movies', type: 'Attribute', valueType: 'Movie[]?', exposure: {get: true}}
          ]
        },
        providedComponents: [
          {
            name: 'Movie',
            properties: [
              {
                name: 'limit',
                type: 'Attribute',
                valueType: 'number',
                value: 100,
                exposure: {get: true, set: true}
              },
              {name: 'find', type: 'Method', exposure: {call: true}}
            ],
            prototype: {
              properties: [
                {
                  name: 'title',
                  type: 'Attribute',
                  valueType: 'string',
                  default: defaultTitle,
                  exposure: {get: true, set: true}
                }
              ]
            },
            consumedComponents: ['Cinema']
          }
        ]
      });

      expect(Cinema.getComponentName()).toBe('Cinema');
      expect(Cinema.prototype.getAttribute('movies').getValueType().toString()).toBe('Movie[]?');
      expect(Cinema.prototype.getAttribute('movies').getExposure()).toStrictEqual({get: true});
      expect(Cinema.prototype.getAttribute('movies').isControlled()).toBe(true);

      const Movie = Cinema.getProvidedComponent('Movie')!;

      expect(Movie.getComponentName()).toBe('Movie');
      expect(Movie.getAttribute('limit').getValue()).toBe(100);
      expect(Movie.getAttribute('limit').getExposure()).toStrictEqual({get: true, set: true});
      expect(Movie.getAttribute('limit').isControlled()).toBe(false);
      expect(Movie.getMethod('find').getExposure()).toStrictEqual({call: true});
      expect(Movie.getConsumedComponent('Cinema')).toBe(Cinema);

      expect(Movie.prototype.getAttribute('title').getDefault()).toBe(defaultTitle);
      expect(Movie.prototype.getAttribute('title').getExposure()).toStrictEqual({
        get: true,
        set: true
      });
      expect(Movie.prototype.getAttribute('title').isControlled()).toBe(false);

      const movie = new Movie();

      expect(movie.getAttribute('title').getValue()).toBe('');

      // --- With a mixin ---

      const Storable = (Base = Component) => {
        const _Storable = class extends Base {
          static storableMethod() {}
        };

        Object.defineProperty(_Storable, '__mixin', {value: 'Storable'});

        return _Storable;
      };

      const Film = Component.unintrospect(
        {
          name: 'Film',
          mixins: ['Storable'],
          prototype: {
            properties: [
              {
                name: 'title',
                type: 'Attribute',
                valueType: 'string?',
                exposure: {get: true, set: true}
              }
            ]
          }
        },
        {mixins: [Storable]}
      );

      expect(Film.getComponentName()).toBe('Film');
      expect(Film.prototype.getAttribute('title').getValueType().toString()).toBe('string?');
      expect(typeof (Film as any).storableMethod).toBe('function');

      expect(() => Component.unintrospect({name: 'Film', mixins: ['Storable']})).toThrow(
        "Couldn't find a component mixin named 'Storable'. Please make sure you specified it when creating your 'ComponentClient'."
      );
    });
  });

  describe('Utilities', () => {
    test('toObject()', async () => {
      class MovieDetails extends EmbeddedComponent {
        @attribute() duration = 0;
      }

      class Movie extends Component {
        @provide() static MovieDetails = MovieDetails;

        @attribute() title = '';
        @attribute('MovieDetails') details!: MovieDetails;
      }

      const movie = new Movie({title: 'Inception', details: new MovieDetails({duration: 120})});

      expect(movie.toObject()).toStrictEqual({title: 'Inception', details: {duration: 120}});

      class Cinema extends Component {
        @provide() static Movie = Movie;

        @attribute() name = '';
        @attribute('Movie[]') movies = new Array<Movie>();
      }

      const cinema = new Cinema({name: 'Paradiso', movies: [movie]});

      expect(cinema.toObject()).toStrictEqual({
        name: 'Paradiso',
        movies: [{title: 'Inception', details: {duration: 120}}]
      });
    });
  });
});
