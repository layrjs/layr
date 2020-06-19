import {Component} from './component';
import {
  isAttributeInstance,
  isPrimaryIdentifierAttributeInstance,
  isSecondaryIdentifierAttributeInstance,
  isStringValueTypeInstance,
  isNumberValueTypeInstance,
  isMethodInstance
} from './properties';
import {
  attribute,
  primaryIdentifier,
  secondaryIdentifier,
  method,
  expose,
  provide,
  consume
} from './decorators';

describe('Decorators', () => {
  test('@attribute()', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @attribute() static token?: string;

      @attribute() title = '';
      @attribute() country?: string;
    }

    let attr = Movie.getAttribute('limit');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('limit');
    expect(attr.getParent()).toBe(Movie);
    expect(attr.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    Movie.limit = 500;

    expect(attr.getValue()).toBe(500);
    expect(Movie.limit).toBe(500);

    let descriptor = Object.getOwnPropertyDescriptor(Movie, 'limit')!;

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

    movie.title = 'The Matrix';

    expect(attr.getValue()).toBe('The Matrix');
    expect(movie.title).toBe('The Matrix');

    descriptor = Object.getOwnPropertyDescriptor(Movie.prototype, 'title')!;

    expect(typeof descriptor.get).toBe('function');
    expect(typeof descriptor.set).toBe('function');

    expect(Object.getOwnPropertyDescriptor(movie, 'title')).toBe(undefined);

    attr = movie.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(movie);
    expect(attr.getDefault()).toBeUndefined();
    expect(attr.evaluateDefault()).toBeUndefined();
    expect(attr.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    movie.country = 'USA';

    expect(attr.getValue()).toBe('USA');
    expect(movie.country).toBe('USA');

    expect(Movie.hasAttribute('offset')).toBe(false);
    expect(() => Movie.getAttribute('offset')).toThrow(
      "The attribute 'offset' is missing (component: 'Movie')"
    );

    movie = new Movie({title: 'Inception', country: 'USA'});

    expect(movie.title).toBe('Inception');
    expect(movie.country).toBe('USA');

    class Film extends Movie {
      @attribute() static limit: number;
      @attribute() static token = '';

      @attribute() title!: string;
      @attribute() country = '';
    }

    attr = Film.getAttribute('limit');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('limit');
    expect(attr.getParent()).toBe(Film);
    expect(attr.getValue()).toBe(500);
    expect(Film.limit).toBe(500);

    Film.limit = 1000;

    expect(attr.getValue()).toBe(1000);
    expect(Film.limit).toBe(1000);
    expect(Movie.limit).toBe(500);

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

    film.title = 'Léon';

    expect(attr.getValue()).toBe('Léon');
    expect(film.title).toBe('Léon');

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
      @attribute({getter: () => 100}) static limit: number;

      @attribute({getter: () => 'Untitled'}) title!: string;
    }

    expect(MotionPicture.limit).toBe(100);
    expect(MotionPicture.prototype.title).toBe('Untitled');

    expect(() => {
      class MotionPicture extends Component {
        @attribute({getter: () => 100}) static limit: number = 30;
      }

      return MotionPicture;
    }).toThrow(
      "An attribute cannot have both a getter or setter and an initial value (component: 'MotionPicture', attribute: 'limit')"
    );

    expect(() => {
      class MotionPicture extends Component {
        @attribute({getter: () => 'Untitled'}) title: string = '';
      }

      return MotionPicture;
    }).toThrow(
      "An attribute cannot have both a getter or setter and a default value (component: 'MotionPicture', attribute: 'title')"
    );
  });

  test('@primaryIdentifier()', async () => {
    class Movie1 extends Component {
      @primaryIdentifier() id!: string;
    }

    let idAttribute = Movie1.prototype.getPrimaryIdentifierAttribute();

    expect(isPrimaryIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie1.prototype);
    expect(isStringValueTypeInstance(idAttribute.getValueType())).toBe(true);
    expect(typeof idAttribute.getDefault()).toBe('function');

    class Movie2 extends Component {
      @primaryIdentifier('number') id!: number;
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
        @primaryIdentifier() static id: string;
      }

      return Movie;
    }).toThrow(
      "Couldn't find a property class while executing @primaryIdentifier() (component: 'Movie', property: 'id')"
    );

    expect(() => {
      class Movie {
        @primaryIdentifier() id!: string;
      }

      return Movie;
    }).toThrow("@primaryIdentifier() must be used inside a component class (property: 'id')");

    expect(() => {
      class Movie extends Component {
        @primaryIdentifier() id!: string;
        @primaryIdentifier() slug!: string;
      }

      return Movie;
    }).toThrow("The component 'Movie' already has a primary identifier attribute");
  });

  test('@secondaryIdentifier()', async () => {
    class User extends Component {
      @secondaryIdentifier() email!: string;
      @secondaryIdentifier() username!: string;
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
    const testExposure = (componentProvider: () => typeof Component) => {
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
        @expose({get: true}) @attribute() static limit: string;
        @expose({call: true}) @method() static find() {}

        @expose({get: true, set: true}) @attribute() title!: string;
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
        @attribute() static limit: string;
        @method() static find() {}

        @attribute() title!: string;
        @method() load() {}
      }

      return Movie;
    });

    testExposure(() => {
      class Movie extends Component {
        @attribute() static limit: string;
        @method() static find() {}

        @attribute() title!: string;
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
      @consume() static Director: typeof Director;
    }

    class Director extends Component {
      @consume() static Movie: typeof Movie;
    }

    class Backend extends Component {
      @provide() static Movie = Movie;
      @provide() static Director = Director;
    }

    expect(Movie.getConsumedComponent('Director')).toBe(Director);
    expect(Movie.Director).toBe(Director);
    expect(Director.getConsumedComponent('Movie')).toBe(Movie);
    expect(Director.Movie).toBe(Movie);

    ((Backend, BackendMovie, BackendDirector) => {
      class Movie extends BackendMovie {
        @consume() static Director: typeof Director;
      }

      class Director extends BackendDirector {
        @consume() static Movie: typeof Movie;
      }

      class Frontend extends Backend {
        @provide() static Movie = Movie;
        @provide() static Director = Director;
      }

      expect(Movie.getConsumedComponent('Director')).toBe(Director);
      expect(Movie.Director).toBe(Director);
      expect(Director.getConsumedComponent('Movie')).toBe(Movie);
      expect(Director.Movie).toBe(Movie);

      return Frontend;
    })(Backend, Movie, Director);

    // The backend should not be affected by the frontend
    expect(Movie.getConsumedComponent('Director')).toBe(Director);
    expect(Movie.Director).toBe(Director);
    expect(Director.getConsumedComponent('Movie')).toBe(Movie);
    expect(Director.Movie).toBe(Movie);

    expect(() => {
      class Movie extends Component {
        // @ts-expect-error
        @consume() Director: typeof Director;
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
