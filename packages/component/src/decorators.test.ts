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

    attr = Movie.getAttribute('token');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('token');
    expect(attr.getParent()).toBe(Movie);
    expect(attr.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    const movie = new Movie();

    attr = movie.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(movie);
    expect(typeof attr.getDefault()).toBe('function');
    expect(attr.evaluateDefault()).toBe('');
    expect(attr.getValue()).toBe('');
    expect(movie.title).toBe('');

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

    expect(() => {
      class Movie extends Component {
        @primaryIdentifier() static id: string;
      }

      return Movie;
    }).toThrow(
      "Cannot create a primary identifier attribute with a parent that is not a component instance (property: 'id')"
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
        // @ts-ignore
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
    expect(Director.getConsumedComponent('Movie')).toBe(Movie);

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
      expect(Director.getConsumedComponent('Movie')).toBe(Movie);

      return Frontend;
    })(Backend, Movie, Director);

    // The backend should not be affected by the frontend
    expect(Movie.getConsumedComponent('Director')).toBe(Director);
    expect(Director.getConsumedComponent('Movie')).toBe(Movie);

    expect(() => {
      class Movie extends Component {
        // @ts-ignore
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
      "@consume() must be used with an attribute declaration which doesn't specify any value (attribute: 'Director')"
    );
  });

  // test('@expose() used with an attribute or a method declaration', async () => {
  //   class Movie extends Component {
  //     @expose({get: true}) static limit = 100;
  //     @expose({call: true}) static find() {}

  //     @expose({get: true}) title = '';
  //     @expose({call: true}) load() {}
  //   }

  //   let property = Movie.getProperty('limit');

  //   expect(isAttribute(property)).toBe(true);
  //   expect(property.getName()).toBe('limit');
  //   expect(property.getParent()).toBe(Movie);
  //   expect(property.getValue()).toBe(100);
  //   expect(property.getExposure()).toEqual({get: true});
  //   expect(Movie.limit).toBe(100);

  //   property = Movie.getProperty('find');

  //   expect(isMethod(property)).toBe(true);
  //   expect(property.getName()).toBe('find');
  //   expect(property.getParent()).toBe(Movie);
  //   expect(property.getExposure()).toEqual({call: true});
  //   expect(typeof Movie.find).toBe('function');

  //   property = Movie.prototype.getProperty('title');

  //   expect(isAttribute(property)).toBe(true);
  //   expect(property.getName()).toBe('title');
  //   expect(property.getParent()).toBe(Movie.prototype);
  //   expect(property.isSet()).toBe(false);
  //   expect(property.getDefaultValue()).toBe('');
  //   expect(property.getExposure()).toEqual({get: true});

  //   property = Movie.prototype.getProperty('load');

  //   expect(isMethod(property)).toBe(true);
  //   expect(property.getName()).toBe('load');
  //   expect(property.getParent()).toBe(Movie.prototype);
  //   expect(property.getExposure()).toEqual({call: true});
  //   expect(typeof Movie.prototype.load).toBe('function');
  // });

  // test('@expose() used after @property(), @attribute(), or @method()', async () => {
  //   class Movie extends Component {
  //     @expose({get: true}) @property() static limit = 100;
  //     @expose({get: true}) @property() static token;
  //     @expose({call: true}) @property() static find() {}

  //     @expose({get: true}) @property() title = '';
  //     @expose({get: true}) @property() country;
  //     @expose({call: true}) @property() load() {}
  //   }

  //   let prop = Movie.getProperty('limit');

  //   expect(isAttribute(prop)).toBe(true);
  //   expect(prop.getName()).toBe('limit');
  //   expect(prop.getParent()).toBe(Movie);
  //   expect(prop.getValue()).toBe(100);
  //   expect(prop.getExposure()).toEqual({get: true});
  //   expect(Movie.limit).toBe(100);

  //   prop = Movie.getProperty('token');

  //   expect(isAttribute(prop)).toBe(true);
  //   expect(prop.getName()).toBe('token');
  //   expect(prop.getParent()).toBe(Movie);
  //   expect(prop.getValue()).toBeUndefined();
  //   expect(prop.getExposure()).toEqual({get: true});
  //   expect(Movie.token).toBeUndefined();

  //   prop = Movie.getProperty('find');

  //   expect(isMethod(prop)).toBe(true);
  //   expect(prop.getName()).toBe('find');
  //   expect(prop.getParent()).toBe(Movie);
  //   expect(prop.getExposure()).toEqual({call: true});
  //   expect(typeof Movie.find).toBe('function');

  //   prop = Movie.prototype.getProperty('title');

  //   expect(isAttribute(prop)).toBe(true);
  //   expect(prop.getName()).toBe('title');
  //   expect(prop.getParent()).toBe(Movie.prototype);
  //   expect(prop.isSet()).toBe(false);
  //   expect(prop.getDefaultValue()).toBe('');
  //   expect(prop.getExposure()).toEqual({get: true});

  //   prop = Movie.prototype.getProperty('country');

  //   expect(isAttribute(prop)).toBe(true);
  //   expect(prop.getName()).toBe('country');
  //   expect(prop.getParent()).toBe(Movie.prototype);
  //   expect(prop.isSet()).toBe(false);
  //   expect(prop.getDefaultValue()).toBeUndefined();
  //   expect(prop.getExposure()).toEqual({get: true});

  //   prop = Movie.prototype.getProperty('load');

  //   expect(isMethod(prop)).toBe(true);
  //   expect(prop.getName()).toBe('load');
  //   expect(prop.getParent()).toBe(Movie.prototype);
  //   expect(prop.getExposure()).toEqual({call: true});
  //   expect(typeof Movie.prototype.load).toBe('function');
  // });

  // test('@expose() used after @inherit()', async () => {
  //   class BaseMovie extends Component {
  //     @property() static limit = 100;
  //     @property() static find() {}

  //     @property() title = '';
  //     @property() load() {}
  //   }

  //   class Movie extends BaseMovie {
  //     @expose({get: true}) @inherit() static limit;
  //     @expose({call: true}) @inherit() static find;

  //     @expose({get: true}) @inherit() title;
  //     @expose({call: true}) @inherit() load;
  //   }

  //   let prop = Movie.getProperty('limit');

  //   expect(isAttribute(prop)).toBe(true);
  //   expect(prop.getName()).toBe('limit');
  //   expect(prop.getParent()).toBe(Movie);
  //   expect(prop.getValue()).toBe(100);
  //   expect(prop.getExposure()).toEqual({get: true});
  //   expect(Movie.limit).toBe(100);

  //   prop = Movie.getProperty('find');

  //   expect(isMethod(prop)).toBe(true);
  //   expect(prop.getName()).toBe('find');
  //   expect(prop.getParent()).toBe(Movie);
  //   expect(prop.getExposure()).toEqual({call: true});
  //   expect(typeof Movie.find).toBe('function');

  //   prop = Movie.prototype.getProperty('title');

  //   expect(isAttribute(prop)).toBe(true);
  //   expect(prop.getName()).toBe('title');
  //   expect(prop.getParent()).toBe(Movie.prototype);
  //   expect(prop.isSet()).toBe(false);
  //   expect(prop.getDefaultValue()).toBe('');
  //   expect(prop.getExposure()).toEqual({get: true});

  //   prop = Movie.prototype.getProperty('load');

  //   expect(isMethod(prop)).toBe(true);
  //   expect(prop.getName()).toBe('load');
  //   expect(prop.getParent()).toBe(Movie.prototype);
  //   expect(prop.getExposure()).toEqual({call: true});
  //   expect(typeof Movie.prototype.load).toBe('function');

  //   expect(
  //     () =>
  //       class Film extends BaseMovie {
  //         @expose({get: true}) @inherit() static offset;
  //       }
  //   ).toThrow(
  //     "@inherit() cannot be used with the property 'offset' which is missing in the parent class"
  //   );
  // });
});
