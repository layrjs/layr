import {WithProperties, property, isProperty} from '../../..';

describe('WithProperties', () => {
  test('@property()', async () => {
    class Movie extends WithProperties() {
      @property() static limit = 100;

      @property() title = '';
    }

    expect(Movie.limit).toBe(100);

    const movie = new Movie();

    expect(movie.title).toBe('');

    const classProperty = Movie.getProperty('limit');

    expect(isProperty(classProperty)).toBe(true);
    expect(classProperty.getName()).toBe('limit');
    expect(classProperty.getParent()).toBe(Movie);

    const prototypeProperty = Movie.prototype.getProperty('title');

    expect(isProperty(prototypeProperty)).toBe(true);
    expect(prototypeProperty.getName()).toBe('title');
    expect(prototypeProperty.getParent()).toBe(Movie.prototype);

    const instanceProperty = movie.getProperty('title');

    expect(isProperty(instanceProperty)).toBe(true);
    expect(instanceProperty.getName()).toBe('title');
    expect(instanceProperty.getParent()).toBe(movie);

    expect(() => Movie.getProperty('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getProperty('offset', {throwIfMissing: false})).toBeUndefined();
  });

  test('getProperty()', async () => {
    class Movie extends WithProperties() {
      @property() static limit = 100;

      @property() title = '';
    }

    const classProperty = Movie.getProperty('limit');

    expect(isProperty(classProperty)).toBe(true);
    expect(classProperty.getName()).toBe('limit');
    expect(classProperty.getParent()).toBe(Movie);

    const prototypeProperty = Movie.prototype.getProperty('title');

    expect(isProperty(prototypeProperty)).toBe(true);
    expect(prototypeProperty.getName()).toBe('title');
    expect(prototypeProperty.getParent()).toBe(Movie.prototype);

    class Film extends Movie {}

    const subclassProperty = Film.getProperty('limit');

    expect(isProperty(subclassProperty)).toBe(true);
    expect(subclassProperty.getName()).toBe('limit');
    expect(subclassProperty.getParent()).toBe(Film);

    const subclassPrototypeProperty = Film.prototype.getProperty('title');

    expect(isProperty(subclassPrototypeProperty)).toBe(true);
    expect(subclassPrototypeProperty.getName()).toBe('title');
    expect(subclassPrototypeProperty.getParent()).toBe(Film.prototype);

    const movie = new Movie();

    const instanceProperty = movie.getProperty('title');

    expect(isProperty(instanceProperty)).toBe(true);
    expect(instanceProperty.getName()).toBe('title');
    expect(instanceProperty.getParent()).toBe(movie);

    expect(() => Movie.getProperty('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getProperty('offset', {throwIfMissing: false})).toBeUndefined();
  });

  test('setProperty()', async () => {
    class Movie extends WithProperties() {}

    expect(Movie.hasProperty('limit')).toBe(false);

    let setPropertyResult = Movie.setProperty('limit');

    expect(Movie.hasProperty('limit')).toBe(true);

    let property = Movie.getProperty('limit');

    expect(property).toBe(setPropertyResult);
    expect(isProperty(property)).toBe(true);
    expect(property.getName()).toBe('limit');
    expect(property.getParent()).toBe(Movie);

    class Film extends Movie {}

    expect(Film.hasProperty('limit')).toBe(true);

    setPropertyResult = Film.setProperty('limit');

    expect(Film.hasProperty('limit')).toBe(true);

    property = Film.getProperty('limit');

    expect(property).toBe(setPropertyResult);
    expect(isProperty(property)).toBe(true);
    expect(property.getName()).toBe('limit');
    expect(property.getParent()).toBe(Film);
  });

  test('hasProperty()', async () => {
    class Movie extends WithProperties() {
      @property() static limit = 100;
    }

    expect(Movie.hasProperty('limit')).toBe(true);
    expect(Movie.hasProperty('offset')).toBe(false);
    expect(Movie.prototype.hasProperty('limit')).toBe(false);
  });

  test('@property()', async () => {
    class Movie extends WithProperties() {
      @property() static limit = 100;

      @property() title = '';
    }

    expect(Movie.limit).toBe(100);

    const movie = new Movie();

    expect(movie.title).toBe('');

    const classProperty = Movie.getProperty('limit');

    expect(isProperty(classProperty)).toBe(true);
    expect(classProperty.getName()).toBe('limit');
    expect(classProperty.getParent()).toBe(Movie);

    const prototypeProperty = Movie.prototype.getProperty('title');

    expect(isProperty(prototypeProperty)).toBe(true);
    expect(prototypeProperty.getName()).toBe('title');
    expect(prototypeProperty.getParent()).toBe(Movie.prototype);

    const instanceProperty = movie.getProperty('title');

    expect(isProperty(instanceProperty)).toBe(true);
    expect(instanceProperty.getName()).toBe('title');
    expect(instanceProperty.getParent()).toBe(movie);

    expect(() => Movie.getProperty('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getProperty('offset', {throwIfMissing: false})).toBeUndefined();
  });

  test('getProperties()', async () => {
    class Movie extends WithProperties() {
      @property() title = '';
      @property() duration = 0;
    }

    const movie = new Movie();

    let properties = movie.getProperties();

    expect(typeof properties[Symbol.iterator]).toBe('function');
    expect(Array.from(properties).map(property => property.getName())).toEqual([
      'title',
      'duration'
    ]);

    const classProperties = Movie.getProperties();

    expect(typeof classProperties[Symbol.iterator]).toBe('function');
    expect(Array.from(classProperties)).toHaveLength(0);

    class Film extends Movie {
      @property() director;
    }

    const film = new Film();

    properties = film.getProperties();

    expect(typeof properties[Symbol.iterator]).toBe('function');
    expect(Array.from(properties).map(property => property.getName())).toEqual([
      'title',
      'duration',
      'director'
    ]);

    properties = film.getProperties({
      filter(property) {
        expect(property.getParent() === this);
        return property.getName() !== 'duration';
      }
    });

    expect(typeof properties[Symbol.iterator]).toBe('function');
    expect(Array.from(properties).map(property => property.getName())).toEqual([
      'title',
      'director'
    ]);
  });

  test('getPropertyNames()', async () => {
    class Movie extends WithProperties() {
      @property() title = '';
      @property() duration = 0;
    }

    expect(Movie.getPropertyNames()).toHaveLength(0);

    expect(Movie.prototype.getPropertyNames()).toEqual(['title', 'duration']);

    const movie = new Movie();

    expect(movie.getPropertyNames()).toEqual(['title', 'duration']);

    class Film extends Movie {
      @property() director;
    }

    const film = new Film();

    expect(film.getPropertyNames()).toEqual(['title', 'duration', 'director']);
  });
});
