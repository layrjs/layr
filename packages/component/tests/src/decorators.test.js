import {
  Component,
  property,
  isProperty,
  attribute,
  isAttribute,
  method,
  isMethod,
  expose,
  inherit
} from '../../..';

describe('Decorators', () => {
  test('@property()', async () => {
    class Movie extends Component() {
      @property() static limit = 100;
      @property() static token;
      @property() static find() {}

      @property() title = '';
      @property() country;
      @property() load() {}
    }

    let prop = Movie.getProperty('limit');

    expect(isProperty(prop)).toBe(true);
    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('limit');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    prop = Movie.getProperty('token');

    expect(isProperty(prop)).toBe(true);
    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('token');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    prop = Movie.getProperty('find');

    expect(isProperty(prop)).toBe(true);
    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('find');
    expect(prop.getParent()).toBe(Movie);
    expect(typeof Movie.find).toBe('function');

    prop = Movie.prototype.getProperty('title');

    expect(isProperty(prop)).toBe(true);
    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('title');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.isSet()).toBe(false);

    prop = Movie.prototype.getProperty('country');

    expect(isProperty(prop)).toBe(true);
    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('country');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.isSet()).toBe(false);

    prop = Movie.prototype.getProperty('load');

    expect(isProperty(prop)).toBe(true);
    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('load');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(typeof Movie.prototype.load).toBe('function');

    const movie = new Movie();

    prop = movie.getProperty('title');

    expect(isProperty(prop)).toBe(true);
    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('title');
    expect(prop.getParent()).toBe(movie);
    expect(prop.getValue()).toBe('');
    expect(movie.title).toBe('');

    prop = movie.getProperty('country');

    expect(isProperty(prop)).toBe(true);
    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('country');
    expect(prop.getParent()).toBe(movie);
    expect(prop.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    prop = movie.getProperty('load');

    expect(isProperty(prop)).toBe(true);
    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('load');
    expect(prop.getParent()).toBe(movie);
    expect(typeof movie.load).toBe('function');
  });

  test('@attribute()', async () => {
    class Movie extends Component() {
      @attribute() static limit = 100;
      @attribute() static token;

      @attribute() title = '';
      @attribute() country;
    }

    let classAttribute = Movie.getAttribute('limit');

    expect(isAttribute(classAttribute)).toBe(true);
    expect(classAttribute.getName()).toBe('limit');
    expect(classAttribute.getParent()).toBe(Movie);
    expect(classAttribute.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    classAttribute = Movie.getAttribute('token');

    expect(isAttribute(classAttribute)).toBe(true);
    expect(classAttribute.getName()).toBe('token');
    expect(classAttribute.getParent()).toBe(Movie);
    expect(classAttribute.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    let prototypeAttribute = Movie.prototype.getAttribute('title');

    expect(isAttribute(prototypeAttribute)).toBe(true);
    expect(prototypeAttribute.getName()).toBe('title');
    expect(prototypeAttribute.getParent()).toBe(Movie.prototype);
    expect(prototypeAttribute.isSet()).toBe(false);

    prototypeAttribute = Movie.prototype.getAttribute('country');

    expect(isAttribute(prototypeAttribute)).toBe(true);
    expect(prototypeAttribute.getName()).toBe('country');
    expect(prototypeAttribute.getParent()).toBe(Movie.prototype);
    expect(prototypeAttribute.isSet()).toBe(false);

    const movie = new Movie();

    let instanceAttribute = movie.getAttribute('title');

    expect(isAttribute(instanceAttribute)).toBe(true);
    expect(instanceAttribute.getName()).toBe('title');
    expect(instanceAttribute.getParent()).toBe(movie);
    expect(instanceAttribute.getValue()).toBe('');
    expect(movie.title).toBe('');

    instanceAttribute = movie.getAttribute('country');

    expect(isAttribute(instanceAttribute)).toBe(true);
    expect(instanceAttribute.getName()).toBe('country');
    expect(instanceAttribute.getParent()).toBe(movie);
    expect(instanceAttribute.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    expect(() => Movie.getAttribute('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getAttribute('offset', {throwIfMissing: false})).toBeUndefined();

    expect(
      () =>
        class Film extends Movie {
          @attribute() static find() {}
        }
    ).toThrow(
      "@attribute() cannot be used without an attribute declaration (property name: 'find')"
    );

    class Film extends Movie {
      @attribute() static limit;
      @attribute() static token = '';

      @attribute() title;
      @attribute() country = '';
    }

    classAttribute = Film.getAttribute('limit');

    expect(isAttribute(classAttribute)).toBe(true);
    expect(classAttribute.getName()).toBe('limit');
    expect(classAttribute.getParent()).toBe(Film);
    expect(classAttribute.getValue()).toBeUndefined();
    expect(Film.limit).toBeUndefined();

    classAttribute = Film.getAttribute('token');

    expect(isAttribute(classAttribute)).toBe(true);
    expect(classAttribute.getName()).toBe('token');
    expect(classAttribute.getParent()).toBe(Film);
    expect(classAttribute.getValue()).toBe('');
    expect(Film.token).toBe('');

    prototypeAttribute = Film.prototype.getAttribute('title');

    expect(isAttribute(prototypeAttribute)).toBe(true);
    expect(prototypeAttribute.getName()).toBe('title');
    expect(prototypeAttribute.getParent()).toBe(Film.prototype);
    expect(prototypeAttribute.isSet()).toBe(false);

    prototypeAttribute = Film.prototype.getAttribute('country');

    expect(isAttribute(prototypeAttribute)).toBe(true);
    expect(prototypeAttribute.getName()).toBe('country');
    expect(prototypeAttribute.getParent()).toBe(Film.prototype);
    expect(prototypeAttribute.isSet()).toBe(false);

    const film = new Film();

    instanceAttribute = film.getAttribute('title');

    expect(isAttribute(instanceAttribute)).toBe(true);
    expect(instanceAttribute.getName()).toBe('title');
    expect(instanceAttribute.getParent()).toBe(film);
    expect(instanceAttribute.getValue()).toBeUndefined();
    expect(film.title).toBeUndefined();

    instanceAttribute = film.getAttribute('country');

    expect(isAttribute(instanceAttribute)).toBe(true);
    expect(instanceAttribute.getName()).toBe('country');
    expect(instanceAttribute.getParent()).toBe(film);
    expect(instanceAttribute.getValue()).toBe('');
    expect(film.country).toBe('');
  });

  test('@method()', async () => {
    class Movie extends Component() {
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
    ).toThrow("@method() cannot be used without a method declaration (property name: 'find')");
  });

  test('@expose() used with an attribute or a method declaration', async () => {
    class Movie extends Component() {
      @expose({get: true}) static limit = 100;
      @expose({call: true}) static find() {}

      @expose({get: true}) title = '';
      @expose({call: true}) load() {}
    }

    let property = Movie.getProperty('limit');

    expect(isAttribute(property)).toBe(true);
    expect(property.getName()).toBe('limit');
    expect(property.getParent()).toBe(Movie);
    expect(property.getValue()).toBe(100);
    expect(property.getExposure()).toEqual({get: true});
    expect(Movie.limit).toBe(100);

    property = Movie.getProperty('find');

    expect(isMethod(property)).toBe(true);
    expect(property.getName()).toBe('find');
    expect(property.getParent()).toBe(Movie);
    expect(property.getExposure()).toEqual({call: true});
    expect(typeof Movie.find).toBe('function');

    property = Movie.prototype.getProperty('title');

    expect(isAttribute(property)).toBe(true);
    expect(property.getName()).toBe('title');
    expect(property.getParent()).toBe(Movie.prototype);
    expect(property.isSet()).toBe(false);
    expect(property.getDefaultValue()).toBe('');
    expect(property.getExposure()).toEqual({get: true});

    property = Movie.prototype.getProperty('load');

    expect(isMethod(property)).toBe(true);
    expect(property.getName()).toBe('load');
    expect(property.getParent()).toBe(Movie.prototype);
    expect(property.getExposure()).toEqual({call: true});
    expect(typeof Movie.prototype.load).toBe('function');
  });

  test('@expose() used after @property(), @attribute(), or @method()', async () => {
    class Movie extends Component() {
      @expose({get: true}) @property() static limit = 100;
      @expose({get: true}) @property() static token;
      @expose({call: true}) @property() static find() {}

      @expose({get: true}) @property() title = '';
      @expose({get: true}) @property() country;
      @expose({call: true}) @property() load() {}
    }

    let prop = Movie.getProperty('limit');

    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('limit');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getValue()).toBe(100);
    expect(prop.getExposure()).toEqual({get: true});
    expect(Movie.limit).toBe(100);

    prop = Movie.getProperty('token');

    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('token');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getValue()).toBeUndefined();
    expect(prop.getExposure()).toEqual({get: true});
    expect(Movie.token).toBeUndefined();

    prop = Movie.getProperty('find');

    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('find');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getExposure()).toEqual({call: true});
    expect(typeof Movie.find).toBe('function');

    prop = Movie.prototype.getProperty('title');

    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('title');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.isSet()).toBe(false);
    expect(prop.getDefaultValue()).toBe('');
    expect(prop.getExposure()).toEqual({get: true});

    prop = Movie.prototype.getProperty('country');

    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('country');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.isSet()).toBe(false);
    expect(prop.getDefaultValue()).toBeUndefined();
    expect(prop.getExposure()).toEqual({get: true});

    prop = Movie.prototype.getProperty('load');

    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('load');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.getExposure()).toEqual({call: true});
    expect(typeof Movie.prototype.load).toBe('function');
  });

  test('@expose() used after @inherit()', async () => {
    class BaseMovie extends Component() {
      @property() static limit = 100;
      @property() static find() {}

      @property() title = '';
      @property() load() {}
    }

    class Movie extends BaseMovie {
      @expose({get: true}) @inherit() static limit;
      @expose({call: true}) @inherit() static find;

      @expose({get: true}) @inherit() title;
      @expose({call: true}) @inherit() load;
    }

    let prop = Movie.getProperty('limit');

    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('limit');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getValue()).toBe(100);
    expect(prop.getExposure()).toEqual({get: true});
    expect(Movie.limit).toBe(100);

    prop = Movie.getProperty('find');

    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('find');
    expect(prop.getParent()).toBe(Movie);
    expect(prop.getExposure()).toEqual({call: true});
    expect(typeof Movie.find).toBe('function');

    prop = Movie.prototype.getProperty('title');

    expect(isAttribute(prop)).toBe(true);
    expect(prop.getName()).toBe('title');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.isSet()).toBe(false);
    expect(prop.getDefaultValue()).toBe('');
    expect(prop.getExposure()).toEqual({get: true});

    prop = Movie.prototype.getProperty('load');

    expect(isMethod(prop)).toBe(true);
    expect(prop.getName()).toBe('load');
    expect(prop.getParent()).toBe(Movie.prototype);
    expect(prop.getExposure()).toEqual({call: true});
    expect(typeof Movie.prototype.load).toBe('function');

    expect(
      () =>
        class Film extends BaseMovie {
          @expose({get: true}) @inherit() static offset;
        }
    ).toThrow(
      "@inherit() cannot be used with the property 'offset' which is missing in the parent class"
    );
  });
});
