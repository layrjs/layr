import {Component} from '../component';
import {
  isAttributeInstance,
  isPrimaryIdentifierAttributeInstance,
  isSecondaryIdentifierAttributeInstance,
  isStringValueTypeInstance,
  isNumberValueTypeInstance,
  isMethodInstance
} from '../properties';
import {
  attribute,
  primaryIdentifier,
  secondaryIdentifier,
  method,
  expose,
  provide,
  consume
} from '../decorators';

describe('Decorators', () => {
  test('@attribute()', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @attribute() static token;

      @attribute() title = '';
      @attribute() country;
    }

    let attr = Movie.getAttribute('limit');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('limit');
    expect(attr.getParent()).toBe(Movie);
    expect(attr.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    let descriptor = Object.getOwnPropertyDescriptor(Movie, 'limit');

    expect(typeof descriptor.get).toBe('function');
    expect(typeof descriptor.set).toBe('function');

    attr = Movie.getAttribute('token');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('token');
    expect(attr.getParent()).toBe(Movie);
    expect(attr.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    let movie = new Movie();

    attr = movie.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(movie);
    expect(typeof attr.getDefault()).toBe('function');
    expect(attr.evaluateDefault()).toBe('');
    expect(attr.getValue()).toBe('');
    expect(movie.title).toBe('');

    descriptor = Object.getOwnPropertyDescriptor(Movie.prototype, 'title');

    expect(typeof descriptor.get).toBe('function');
    expect(typeof descriptor.set).toBe('function');

    attr = movie.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(movie);
    expect(attr.getDefault()).toBeUndefined();
    expect(attr.evaluateDefault()).toBeUndefined();
    expect(attr.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    expect(Movie.hasAttribute('offset')).toBe(false);
    expect(() => Movie.getAttribute('offset')).toThrow(
      "The attribute 'offset' is missing (component: 'Movie')"
    );

    movie = new Movie({title: 'Inception', country: 'USA'});

    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    class Film extends Movie {
      @attribute() static limit = 100; // With JS, we must repeat the value of static attributes
      @attribute() static token = '';

      @attribute() title;
      @attribute() country = '';
    }

    attr = Film.getAttribute('limit');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('limit');
    expect(attr.getParent()).toBe(Film);
    expect(attr.getValue()).toBe(100);
    expect(Film.limit).toBe(100);

    attr = Film.getAttribute('token');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('token');
    expect(attr.getParent()).toBe(Film);
    expect(attr.getValue()).toBe('');
    expect(Film.token).toBe('');

    const film = new Film();

    attr = film.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(film);
    expect(typeof attr.getDefault()).toBe('function');
    expect(attr.evaluateDefault()).toBe('');
    expect(attr.getValue()).toBe('');
    expect(film.title).toBe('');

    attr = film.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(film);
    expect(typeof attr.getDefault()).toBe('function');
    expect(attr.evaluateDefault()).toBe('');
    expect(attr.getValue()).toBe('');
    expect(film.country).toBe('');

    // --- Using getters ---

    class MotionPicture extends Component {
      @attribute({getter: () => 100}) static limit;

      @attribute({getter: () => 'Untitled'}) title;
    }

    expect(MotionPicture.limit).toBe(100);
    expect(MotionPicture.prototype.title).toBe('Untitled');

    expect(() => {
      class MotionPicture extends Component {
        @attribute({getter: () => 100}) static limit = 30;
      }

      return MotionPicture;
    }).toThrow(
      "An attribute cannot have both a getter or setter and an initial value (component: 'MotionPicture', attribute: 'limit')"
    );

    expect(() => {
      class MotionPicture extends Component {
        @attribute({getter: () => 'Untitled'}) title = '';
      }

      return MotionPicture;
    }).toThrow(
      "An attribute cannot have both a getter or setter and a default value (component: 'MotionPicture', attribute: 'title')"
    );
  });

  test('@primaryIdentifier()', async () => {
    class Movie1 extends Component {
      @primaryIdentifier() id;
    }

    let idAttribute = Movie1.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie1.prototype);
    expect(isStringValueTypeInstance(idAttribute.getValueType())).toBe(true);
    expect(typeof idAttribute.getDefault()).toBe('function');

    class Movie2 extends Component {
      @primaryIdentifier('number') id;
    }

    idAttribute = Movie2.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie2.prototype);
    expect(isNumberValueTypeInstance(idAttribute.getValueType())).toBe(true);
    expect(idAttribute.getDefault()).toBeUndefined();

    class Movie3 extends Component {
      @primaryIdentifier('number') id = Math.random();
    }

    idAttribute = Movie3.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie3.prototype);
    expect(isNumberValueTypeInstance(idAttribute.getValueType())).toBe(true);
    expect(typeof idAttribute.getDefault()).toBe('function');

    const movie = new Movie3();

    expect(typeof movie.id === 'number').toBe(true);

    expect(() => {
      class Movie extends Component {
        @primaryIdentifier() static id;
      }

      return Movie;
    }).toThrow(
      "Couldn't find a property class while executing @primaryIdentifier() (component: 'Movie', property: 'id')"
    );

    expect(() => {
      class Movie {
        @primaryIdentifier() id;
      }

      return Movie;
    }).toThrow("@primaryIdentifier() must be used inside a component class (property: 'id')");

    expect(() => {
      class Movie extends Component {
        @primaryIdentifier() id;
        @primaryIdentifier() slug;
      }

      return Movie;
    }).toThrow("The component 'Movie' already has a primary identifier attribute");
  });

  test('@secondaryIdentifier()', async () => {
    class User extends Component {
      @secondaryIdentifier() email;
      @secondaryIdentifier() username;
    }

    const emailAttribute = User.prototype.getSecondaryIdentifierAttribute('email');

    expect(isSecondaryIdentifierAttributeInstance(emailAttribute)).toBe(true);
    expect(emailAttribute.getName()).toBe('email');
    expect(emailAttribute.getParent()).toBe(User.prototype);
    expect(isStringValueTypeInstance(emailAttribute.getValueType())).toBe(true);
    expect(emailAttribute.getDefault()).toBeUndefined();

    const usernameAttribute = User.prototype.getSecondaryIdentifierAttribute('username');

    expect(isSecondaryIdentifierAttributeInstance(usernameAttribute)).toBe(true);
    expect(usernameAttribute.getName()).toBe('username');
    expect(usernameAttribute.getParent()).toBe(User.prototype);
    expect(isStringValueTypeInstance(usernameAttribute.getValueType())).toBe(true);
    expect(usernameAttribute.getDefault()).toBeUndefined();
  });

  test('@method()', async () => {
    class Movie extends Component {
      @method() static find() {}

      @method() load() {}
    }

    expect(typeof Movie.find).toBe('function');

    const movie = new Movie();

    expect(typeof movie.load).toBe('function');

    let meth = Movie.getMethod('find');

    expect(isMethodInstance(meth)).toBe(true);
    expect(meth.getName()).toBe('find');
    expect(meth.getParent()).toBe(Movie);

    meth = movie.getMethod('load');

    expect(isMethodInstance(meth)).toBe(true);
    expect(meth.getName()).toBe('load');
    expect(meth.getParent()).toBe(movie);

    expect(Movie.hasMethod('delete')).toBe(false);
    expect(() => Movie.getMethod('delete')).toThrow(
      "The method 'delete' is missing (component: 'Movie')"
    );
  });

  test('@expose()', async () => {
    const testExposure = (componentProvider) => {
      const component = componentProvider();

      let prop = component.getProperty('limit');

      expect(isAttributeInstance(prop)).toBe(true);
      expect(prop.getName()).toBe('limit');
      expect(prop.getExposure()).toStrictEqual({get: true});

      prop = component.getProperty('find');

      expect(isMethodInstance(prop)).toBe(true);
      expect(prop.getName()).toBe('find');
      expect(prop.getExposure()).toStrictEqual({call: true});

      prop = component.prototype.getProperty('title');

      expect(isAttributeInstance(prop)).toBe(true);
      expect(prop.getName()).toBe('title');
      expect(prop.getExposure()).toStrictEqual({get: true, set: true});

      prop = component.prototype.getProperty('load');

      expect(isMethodInstance(prop)).toBe(true);
      expect(prop.getName()).toBe('load');
      expect(prop.getExposure()).toStrictEqual({call: true});
    };

    testExposure(() => {
      class Movie extends Component {
        @expose({get: true}) @attribute() static limit;
        @expose({call: true}) @method() static find() {}

        @expose({get: true, set: true}) @attribute() title;
        @expose({call: true}) @method() load() {}
      }

      return Movie;
    });

    testExposure(() => {
      @expose({
        limit: {get: true},
        find: {call: true},
        prototype: {
          title: {get: true, set: true},
          load: {call: true}
        }
      })
      class Movie extends Component {
        @attribute() static limit;
        @method() static find() {}

        @attribute() title;
        @method() load() {}
      }

      return Movie;
    });

    testExposure(() => {
      class Movie extends Component {
        @attribute() static limit;
        @method() static find() {}

        @attribute() title;
        @method() load() {}
      }

      @expose({
        limit: {get: true},
        find: {call: true},
        prototype: {
          title: {get: true, set: true},
          load: {call: true}
        }
      })
      class ExposedMovie extends Movie {}

      return ExposedMovie;
    });
  });

  test('@provide()', async () => {
    class Movie extends Component {}

    class Backend extends Component {
      @provide() static Movie = Movie;
    }

    expect(Backend.getProvidedComponent('Movie')).toBe(Movie);

    ((Backend, BackendMovie) => {
      class Movie extends BackendMovie {}

      class Frontend extends Backend {
        @provide() static Movie = Movie;
      }

      expect(Frontend.getProvidedComponent('Movie')).toBe(Movie);
    })(Backend, Movie);

    // The backend should not be affected by the frontend
    expect(Backend.getProvidedComponent('Movie')).toBe(Movie);

    expect(() => {
      class Movie extends Component {}

      class Backend extends Component {
        // @ts-expect-error
        @provide() Movie = Movie;
      }

      return Backend;
    }).toThrow(
      "@provide() must be used inside a component class with as static attribute declaration (attribute: 'Movie')"
    );

    expect(() => {
      class Movie {}

      class Backend extends Component {
        @provide() static Movie = Movie;
      }

      return Backend;
    }).toThrow(
      "@provide() must be used with an attribute declaration specifying a component class (attribute: 'Movie')"
    );
  });

  test('@consume()', async () => {
    class Movie extends Component {
      @consume() static Director;
    }

    class Director extends Component {
      @consume() static Movie;
    }

    class Backend extends Component {
      @provide() static Movie = Movie;
      @provide() static Director = Director;
    }

    expect(Movie.getConsumedComponent('Director')).toBe(Director);
    expect(Director.getConsumedComponent('Movie')).toBe(Movie);

    ((Backend, BackendMovie, BackendDirector) => {
      class Movie extends BackendMovie {
        @consume() static Director;
      }

      class Director extends BackendDirector {
        @consume() static Movie;
      }

      class Frontend extends Backend {
        @provide() static Movie = Movie;
        @provide() static Director = Director;
      }

      expect(Movie.getConsumedComponent('Director')).toBe(Director);
      expect(Director.getConsumedComponent('Movie')).toBe(Movie);

      return Frontend;
    })(Backend, Movie, Director);

    // The backend should not be affected by the frontend
    expect(Movie.getConsumedComponent('Director')).toBe(Director);
    expect(Director.getConsumedComponent('Movie')).toBe(Movie);

    expect(() => {
      class Movie extends Component {
        // @ts-expect-error
        @consume() Director;
      }

      class Director extends Component {}

      return Movie;
    }).toThrow(
      "@consume() must be used inside a component class with as static attribute declaration (attribute: 'Director')"
    );

    expect(() => {
      class Director extends Component {}

      class Movie extends Component {
        @consume() static Director = Director;
      }

      return Movie;
    }).toThrow(
      "@consume() must be used with an attribute declaration which does not specify any value (attribute: 'Director')"
    );
  });
});
