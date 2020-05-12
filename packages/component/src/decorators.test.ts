import {Component} from './component';
import {isAttributeInstance} from './attribute';
import {attribute} from './decorators';

describe('Decorators', () => {
  test('@attribute()', async () => {
    // TODO: Improve @attribute developer experience
    class Movie extends Component {
      @attribute({value: 100}) static limit: number;
      @attribute({value: undefined}) static token?: string;

      @attribute({default: ''}) title!: string;
      @attribute({default: undefined}) country?: string;
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

    attr = Movie.prototype.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(Movie.prototype);
    expect(attr.isSet()).toBe(false);

    attr = Movie.prototype.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(Movie.prototype);
    expect(attr.isSet()).toBe(false);

    const movie = new Movie();

    attr = movie.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(movie);
    expect(attr.getValue()).toBe('');
    expect(movie.title).toBe('');

    attr = movie.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(movie);
    expect(attr.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    expect(Movie.hasAttribute('offset')).toBe(false);
    expect(() => Movie.getAttribute('offset')).toThrow(
      "The attribute 'offset' is missing (component: 'Movie')"
    );

    class Film extends Movie {
      @attribute({value: undefined}) static limit: number;
      @attribute({value: ''}) static token?: string;

      @attribute({default: undefined}) title!: string;
      @attribute({default: ''}) country?: string;
    }

    attr = Film.getAttribute('limit');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('limit');
    expect(attr.getParent()).toBe(Film);
    expect(attr.getValue()).toBeUndefined();
    expect(Film.limit).toBeUndefined();

    attr = Film.getAttribute('token');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('token');
    expect(attr.getParent()).toBe(Film);
    expect(attr.getValue()).toBe('');
    expect(Film.token).toBe('');

    attr = Film.prototype.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(Film.prototype);
    expect(attr.isSet()).toBe(false);

    attr = Film.prototype.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(Film.prototype);
    expect(attr.isSet()).toBe(false);

    const film = new Film();

    attr = film.getAttribute('title');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('title');
    expect(attr.getParent()).toBe(film);
    expect(attr.getValue()).toBeUndefined();
    expect(film.title).toBeUndefined();

    attr = film.getAttribute('country');

    expect(isAttributeInstance(attr)).toBe(true);
    expect(attr.getName()).toBe('country');
    expect(attr.getParent()).toBe(film);
    expect(attr.getValue()).toBe('');
    expect(film.country).toBe('');
  });

  // test('@method()', async () => {
  //   class Movie extends Component {
  //     @method() static find() {}

  //     @method() load() {}
  //   }

  //   expect(typeof Movie.find).toBe('function');

  //   const movie = new Movie();

  //   expect(typeof movie.load).toBe('function');

  //   const classMethod = Movie.getMethod('find');

  //   expect(isMethod(classMethod)).toBe(true);
  //   expect(classMethod.getName()).toBe('find');
  //   expect(classMethod.getParent()).toBe(Movie);

  //   const prototypeMethod = Movie.prototype.getMethod('load');

  //   expect(isMethod(prototypeMethod)).toBe(true);
  //   expect(prototypeMethod.getName()).toBe('load');
  //   expect(prototypeMethod.getParent()).toBe(Movie.prototype);

  //   const instanceMethod = movie.getMethod('load');

  //   expect(isMethod(instanceMethod)).toBe(true);
  //   expect(instanceMethod.getName()).toBe('load');
  //   expect(instanceMethod.getParent()).toBe(movie);

  //   expect(() => Movie.getMethod('delete')).toThrow("The property 'delete' is missing");
  //   expect(Movie.getMethod('delete', {throwIfMissing: false})).toBeUndefined();

  //   expect(
  //     () =>
  //       class Film extends Movie {
  //         @method() static find;
  //       }
  //   ).toThrow("@method() cannot be used without a method declaration (property name: 'find')");
  // });

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
