import {WithProperties, isProperty, attribute, isAttribute, method, isMethod} from '../../..';

describe('WithProperties', () => {
  describe('Properties', () => {
    test('getProperty()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @method() static find() {}

        @attribute() title = '';
      }

      let classProperty = Movie.getProperty('limit');

      expect(isProperty(classProperty)).toBe(true);
      expect(classProperty.getName()).toBe('limit');
      expect(classProperty.getParent()).toBe(Movie);

      classProperty = Movie.getProperty('find');

      expect(isProperty(classProperty)).toBe(true);
      expect(classProperty.getName()).toBe('find');
      expect(classProperty.getParent()).toBe(Movie);

      const prototypeProperty = Movie.prototype.getProperty('title');

      expect(isProperty(prototypeProperty)).toBe(true);
      expect(prototypeProperty.getName()).toBe('title');
      expect(prototypeProperty.getParent()).toBe(Movie.prototype);

      class Film extends Movie {}

      let subclassProperty = Film.getProperty('limit');

      expect(isProperty(subclassProperty)).toBe(true);
      expect(subclassProperty.getName()).toBe('limit');
      expect(subclassProperty.getParent()).toBe(Film);

      subclassProperty = Film.getProperty('find');

      expect(isProperty(subclassProperty)).toBe(true);
      expect(subclassProperty.getName()).toBe('find');
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

      let setPropertyResult = Movie.setProperty('limit', 'attribute');

      expect(Movie.hasProperty('limit')).toBe(true);

      let property = Movie.getProperty('limit');

      expect(property).toBe(setPropertyResult);
      expect(isProperty(property)).toBe(true);
      expect(isAttribute(property)).toBe(true);
      expect(property.getName()).toBe('limit');
      expect(property.getParent()).toBe(Movie);

      expect(Movie.hasProperty('find')).toBe(false);

      setPropertyResult = Movie.setProperty('find', 'method');

      expect(Movie.hasProperty('find')).toBe(true);

      property = Movie.getProperty('find');

      expect(property).toBe(setPropertyResult);
      expect(isProperty(property)).toBe(true);
      expect(isMethod(property)).toBe(true);
      expect(property.getName()).toBe('find');
      expect(property.getParent()).toBe(Movie);

      class Film extends Movie {}

      expect(Film.hasProperty('limit')).toBe(true);

      setPropertyResult = Film.setProperty('limit', 'attribute');

      expect(Film.hasProperty('limit')).toBe(true);

      property = Film.getProperty('limit');

      expect(property).toBe(setPropertyResult);
      expect(isProperty(property)).toBe(true);
      expect(property.getName()).toBe('limit');
      expect(property.getParent()).toBe(Film);
    });

    test('hasProperty()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @method() static find() {}
      }

      expect(Movie.hasProperty('limit')).toBe(true);
      expect(Movie.hasProperty('offset')).toBe(false);
      expect(Movie.hasProperty('find')).toBe(true);
      expect(Movie.prototype.hasProperty('limit')).toBe(false);
    });

    test('getProperties()', async () => {
      class Movie extends WithProperties() {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      const movie = new Movie();

      let properties = movie.getProperties();

      expect(typeof properties[Symbol.iterator]).toBe('function');
      expect(Array.from(properties).map(property => property.getName())).toEqual([
        'title',
        'duration',
        'load',
        'save'
      ]);

      const classProperties = Movie.getProperties();

      expect(typeof classProperties[Symbol.iterator]).toBe('function');
      expect(Array.from(classProperties)).toHaveLength(0);

      class Film extends Movie {
        @attribute() director;
      }

      const film = new Film();

      properties = film.getProperties();

      expect(typeof properties[Symbol.iterator]).toBe('function');
      expect(Array.from(properties).map(property => property.getName())).toEqual([
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
      expect(Array.from(properties).map(property => property.getName())).toEqual([
        'title',
        'load',
        'save',
        'director'
      ]);
    });

    test('getPropertyNames()', async () => {
      class Movie extends WithProperties() {
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
        @attribute() director;
      }

      const film = new Film();

      expect(film.getPropertyNames()).toEqual(['title', 'duration', 'load', 'save', 'director']);
    });
  });

  describe('Attributes', () => {
    test('getAttribute()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @method() static find() {}

        @attribute() title = '';
      }

      const classAttribute = Movie.getAttribute('limit');

      expect(isAttribute(classAttribute)).toBe(true);
      expect(classAttribute.getName()).toBe('limit');
      expect(classAttribute.getParent()).toBe(Movie);

      expect(() => Movie.getAttribute('find')).toThrow(
        "The property 'find' exists, but it is not an attribute"
      );

      const prototypeAttribute = Movie.prototype.getAttribute('title');

      expect(isAttribute(prototypeAttribute)).toBe(true);
      expect(prototypeAttribute.getName()).toBe('title');
      expect(prototypeAttribute.getParent()).toBe(Movie.prototype);

      class Film extends Movie {}

      const subclassAttribute = Film.getAttribute('limit');

      expect(isAttribute(subclassAttribute)).toBe(true);
      expect(subclassAttribute.getName()).toBe('limit');
      expect(subclassAttribute.getParent()).toBe(Film);

      const subclassPrototypeAttribute = Film.prototype.getAttribute('title');

      expect(isAttribute(subclassPrototypeAttribute)).toBe(true);
      expect(subclassPrototypeAttribute.getName()).toBe('title');
      expect(subclassPrototypeAttribute.getParent()).toBe(Film.prototype);

      const movie = new Movie();

      const instanceAttribute = movie.getAttribute('title');

      expect(isAttribute(instanceAttribute)).toBe(true);
      expect(instanceAttribute.getName()).toBe('title');
      expect(instanceAttribute.getParent()).toBe(movie);

      expect(() => Movie.getAttribute('offset')).toThrow("The property 'offset' is missing");
      expect(Movie.getAttribute('offset', {throwIfMissing: false})).toBeUndefined();
    });

    test('setAttribute()', async () => {
      class Movie extends WithProperties() {
        @method() static find() {}
      }

      expect(Movie.hasAttribute('limit')).toBe(false);

      let setAttributeResult = Movie.setAttribute('limit');

      expect(Movie.hasAttribute('limit')).toBe(true);

      let attribute = Movie.getAttribute('limit');

      expect(attribute).toBe(setAttributeResult);
      expect(isAttribute(attribute)).toBe(true);
      expect(attribute.getName()).toBe('limit');
      expect(attribute.getParent()).toBe(Movie);

      expect(() => Movie.setAttribute('find')).toThrow(
        "Cannot change the type of the 'find' property"
      );

      class Film extends Movie {}

      expect(Film.hasAttribute('limit')).toBe(true);

      setAttributeResult = Film.setAttribute('limit');

      expect(Film.hasAttribute('limit')).toBe(true);

      attribute = Film.getAttribute('limit');

      expect(attribute).toBe(setAttributeResult);
      expect(isAttribute(attribute)).toBe(true);
      expect(attribute.getName()).toBe('limit');
      expect(attribute.getParent()).toBe(Film);

      expect(() => Film.setAttribute('find')).toThrow(
        "Cannot change the type of the 'find' property"
      );
    });

    test('hasAttribute()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @method() static find() {}
      }

      expect(Movie.hasAttribute('limit')).toBe(true);
      expect(Movie.hasAttribute('offset')).toBe(false);
      expect(Movie.prototype.hasAttribute('limit')).toBe(false);

      expect(() => Movie.hasAttribute('find')).toThrow(
        "The property 'find' exists, but it is not an attribute"
      );
    });

    test('getAttributes()', async () => {
      class Movie extends WithProperties() {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      const movie = new Movie();

      let attributes = movie.getAttributes();

      expect(typeof attributes[Symbol.iterator]).toBe('function');
      expect(Array.from(attributes).map(property => property.getName())).toEqual([
        'title',
        'duration'
      ]);

      const classAttributes = Movie.getAttributes();

      expect(typeof classAttributes[Symbol.iterator]).toBe('function');
      expect(Array.from(classAttributes)).toHaveLength(0);

      class Film extends Movie {
        @attribute() director;
      }

      const film = new Film();

      attributes = film.getAttributes();

      expect(typeof attributes[Symbol.iterator]).toBe('function');
      expect(Array.from(attributes).map(property => property.getName())).toEqual([
        'title',
        'duration',
        'director'
      ]);

      attributes = film.getAttributes({
        filter(property) {
          expect(property.getParent() === this);
          return property.getName() !== 'duration';
        }
      });

      expect(typeof attributes[Symbol.iterator]).toBe('function');
      expect(Array.from(attributes).map(property => property.getName())).toEqual([
        'title',
        'director'
      ]);
    });

    test('@attribute()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @attribute() title = '';
      }

      expect(Movie.limit).toBe(100);

      const movie = new Movie();

      expect(movie.title).toBe('');

      const classAttribute = Movie.getAttribute('limit');

      expect(isAttribute(classAttribute)).toBe(true);
      expect(classAttribute.getName()).toBe('limit');
      expect(classAttribute.getParent()).toBe(Movie);

      const prototypeAttribute = Movie.prototype.getAttribute('title');

      expect(isAttribute(prototypeAttribute)).toBe(true);
      expect(prototypeAttribute.getName()).toBe('title');
      expect(prototypeAttribute.getParent()).toBe(Movie.prototype);

      const instanceAttribute = movie.getAttribute('title');

      expect(isAttribute(instanceAttribute)).toBe(true);
      expect(instanceAttribute.getName()).toBe('title');
      expect(instanceAttribute.getParent()).toBe(movie);

      expect(() => Movie.getAttribute('offset')).toThrow("The property 'offset' is missing");
      expect(Movie.getAttribute('offset', {throwIfMissing: false})).toBeUndefined();

      expect(
        () =>
          class Film extends Movie {
            @attribute() static find() {}
          }
      ).toThrow(
        "@attribute() cannot be used without an attribute definition (property name: 'find')"
      );
    });
  });

  describe('Methods', () => {
    test('getMethod()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @method() static find() {}

        @method() load() {}
      }

      const classMethod = Movie.getMethod('find');

      expect(isMethod(classMethod)).toBe(true);
      expect(classMethod.getName()).toBe('find');
      expect(classMethod.getParent()).toBe(Movie);

      expect(() => Movie.getMethod('limit')).toThrow(
        "The property 'limit' exists, but it is not a method"
      );

      const prototypeMethod = Movie.prototype.getMethod('load');

      expect(isMethod(prototypeMethod)).toBe(true);
      expect(prototypeMethod.getName()).toBe('load');
      expect(prototypeMethod.getParent()).toBe(Movie.prototype);

      class Film extends Movie {}

      const subclassMethod = Film.getMethod('find');

      expect(isMethod(subclassMethod)).toBe(true);
      expect(subclassMethod.getName()).toBe('find');
      expect(subclassMethod.getParent()).toBe(Film);

      const subclassPrototypeMethod = Film.prototype.getMethod('load');

      expect(isMethod(subclassPrototypeMethod)).toBe(true);
      expect(subclassPrototypeMethod.getName()).toBe('load');
      expect(subclassPrototypeMethod.getParent()).toBe(Film.prototype);

      const movie = new Movie();

      const instanceMethod = movie.getMethod('load');

      expect(isMethod(instanceMethod)).toBe(true);
      expect(instanceMethod.getName()).toBe('load');
      expect(instanceMethod.getParent()).toBe(movie);

      expect(() => Movie.getMethod('load')).toThrow("The property 'load' is missing");
      expect(Movie.getMethod('load', {throwIfMissing: false})).toBeUndefined();
    });

    test('setMethod()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;
      }

      expect(Movie.hasMethod('find')).toBe(false);

      let setMethodResult = Movie.setMethod('find');

      expect(Movie.hasMethod('find')).toBe(true);

      let method = Movie.getMethod('find');

      expect(method).toBe(setMethodResult);
      expect(isMethod(method)).toBe(true);
      expect(method.getName()).toBe('find');
      expect(method.getParent()).toBe(Movie);

      expect(() => Movie.setMethod('limit')).toThrow(
        "Cannot change the type of the 'limit' property"
      );

      class Film extends Movie {}

      expect(Film.hasMethod('find')).toBe(true);

      setMethodResult = Film.setMethod('find');

      expect(Film.hasMethod('find')).toBe(true);

      method = Film.getMethod('find');

      expect(method).toBe(setMethodResult);
      expect(isMethod(method)).toBe(true);
      expect(method.getName()).toBe('find');
      expect(method.getParent()).toBe(Film);

      expect(() => Film.setMethod('limit')).toThrow(
        "Cannot change the type of the 'limit' property"
      );
    });

    test('hasMethod()', async () => {
      class Movie extends WithProperties() {
        @attribute() static limit = 100;

        @method() static find() {}
      }

      expect(Movie.hasMethod('find')).toBe(true);
      expect(Movie.hasMethod('load')).toBe(false);
      expect(Movie.prototype.hasMethod('find')).toBe(false);

      expect(() => Movie.hasMethod('limit')).toThrow(
        "The property 'limit' exists, but it is not a method"
      );
    });

    test('getMethods()', async () => {
      class Movie extends WithProperties() {
        @attribute() title = '';
        @attribute() duration = 0;

        @method() load() {}
        @method() save() {}
      }

      const movie = new Movie();

      let methods = movie.getMethods();

      expect(typeof methods[Symbol.iterator]).toBe('function');
      expect(Array.from(methods).map(property => property.getName())).toEqual(['load', 'save']);

      const classMethods = Movie.getMethods();

      expect(typeof classMethods[Symbol.iterator]).toBe('function');
      expect(Array.from(classMethods)).toHaveLength(0);

      class Film extends Movie {
        @method() delete() {}
      }

      const film = new Film();

      methods = film.getMethods();

      expect(typeof methods[Symbol.iterator]).toBe('function');
      expect(Array.from(methods).map(property => property.getName())).toEqual([
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
      expect(Array.from(methods).map(property => property.getName())).toEqual(['load', 'delete']);
    });

    test('@method()', async () => {
      class Movie extends WithProperties() {
        @method() static find() {}

        @method() load() {}
      }

      expect(typeof Movie.find).toBe('function');

      const movie = new Movie();

      expect(typeof movie.load).toBe('function');

      const classMethod = Movie.getMethod('find');

      expect(isMethod(classMethod)).toBe(true);
      expect(classMethod.getName()).toBe('find');
      expect(classMethod.getParent()).toBe(Movie);

      const prototypeMethod = Movie.prototype.getMethod('load');

      expect(isMethod(prototypeMethod)).toBe(true);
      expect(prototypeMethod.getName()).toBe('load');
      expect(prototypeMethod.getParent()).toBe(Movie.prototype);

      const instanceMethod = movie.getMethod('load');

      expect(isMethod(instanceMethod)).toBe(true);
      expect(instanceMethod.getName()).toBe('load');
      expect(instanceMethod.getParent()).toBe(movie);

      expect(() => Movie.getMethod('delete')).toThrow("The property 'delete' is missing");
      expect(Movie.getMethod('delete', {throwIfMissing: false})).toBeUndefined();

      expect(
        () =>
          class Film extends Movie {
            @method() static find;
          }
      ).toThrow("@method() cannot be used without a method definition (property name: 'find')");
    });
  });
});
