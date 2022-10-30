import type {ExtendedError} from '@layr/utilities';

import {Component} from '../component';
import {EmbeddedComponent} from '../embedded-component';
import {Attribute} from './attribute';
import {isNumberValueTypeInstance} from './value-types';
import {sanitizers} from '../sanitization';
import {validators} from '../validation';

describe('Attribute', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    const attribute = new Attribute('limit', Movie, {valueType: 'number'});

    expect(Attribute.isAttribute(attribute)).toBe(true);
    expect(attribute.getName()).toBe('limit');
    expect(attribute.getParent()).toBe(Movie);
    expect(isNumberValueTypeInstance(attribute.getValueType())).toBe(true);
  });

  test('Value', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {valueType: 'string'});

    expect(attribute.isSet()).toBe(false);
    expect(() => attribute.getValue()).toThrow(
      "Cannot get the value of an unset attribute (attribute: 'Movie.prototype.title')"
    );
    expect(attribute.getValue({throwIfUnset: false})).toBeUndefined();

    attribute.setValue('Inception');

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBe('Inception');

    attribute.unsetValue();

    expect(attribute.isSet()).toBe(false);

    expect(() => attribute.setValue(123)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'Movie.prototype.title', expected type: 'string', received type: 'number')"
    );
    expect(() => attribute.setValue(undefined)).toThrow(
      "Cannot assign a value of an unexpected type (attribute: 'Movie.prototype.title', expected type: 'string', received type: 'undefined')"
    );
  });

  test('Value source', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {valueType: 'string'});

    attribute.setValue('Inception');

    expect(attribute.getValueSource()).toBe('local');

    attribute.setValue('Inception', {source: 'server'});

    expect(attribute.getValueSource()).toBe('server');
  });

  test('Accessors', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {
      valueType: 'string',
      getter() {
        expect(this).toBe(movie);
        return this._title;
      },
      setter(title) {
        expect(this).toBe(movie);
        this._title = title.substr(0, 1).toUpperCase() + title.substr(1);
      }
    });

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBeUndefined();

    attribute.setValue('inception');

    expect(attribute.getValue()).toBe('Inception');

    expect(
      () =>
        new Attribute('title', movie, {
          setter(title) {
            this._title = title;
          }
        })
    ).toThrow(
      "An attribute cannot have a setter without a getter (attribute: 'Movie.prototype.title')"
    );
  });

  test('Initial value', async () => {
    class Movie extends Component {}

    let attribute = new Attribute('limit', Movie, {valueType: 'number'});

    expect(attribute.isSet()).toBe(false);

    attribute = new Attribute('limit', Movie, {valueType: 'number', value: 100});

    expect(attribute.isSet()).toBe(true);
    expect(attribute.getValue()).toBe(100);

    expect(
      () =>
        new Attribute('limit', Movie, {
          valueType: 'number',
          value: 100,
          getter() {
            return 100;
          }
        })
    ).toThrow(
      "An attribute cannot have both a getter or setter and an initial value (attribute: 'Movie.limit')"
    );
  });

  test('Default value', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    let attribute = new Attribute('duration', movie, {valueType: 'number?'});

    expect(attribute.getDefault()).toBe(undefined);
    expect(attribute.evaluateDefault()).toBe(undefined);

    attribute = new Attribute('title', movie, {valueType: 'string', default: ''});

    expect(attribute.getDefault()).toBe('');
    expect(attribute.evaluateDefault()).toBe('');

    attribute = new Attribute('title', movie, {valueType: 'string', default: () => 1 + 1});

    expect(typeof attribute.getDefault()).toBe('function');
    expect(attribute.evaluateDefault()).toBe(2);

    attribute = new Attribute('movieClass', movie, {valueType: 'string', default: Movie});

    expect(typeof attribute.getDefault()).toBe('function');
    expect(attribute.evaluateDefault()).toBe(Movie);

    expect(
      () =>
        new Attribute('title', movie, {
          valueType: 'number?',
          default: '',
          getter() {
            return '';
          }
        })
    ).toThrow(
      "An attribute cannot have both a getter or setter and a default value (attribute: 'Movie.prototype.title')"
    );
  });

  test('isControlled() and markAsControlled()', async () => {
    class Movie extends Component {}

    const attribute = new Attribute('title', Movie.prototype);

    expect(attribute.isControlled()).toBe(false);

    attribute.setValue('Inception');

    expect(attribute.getValue()).toBe('Inception');

    attribute.markAsControlled();

    expect(attribute.isControlled()).toBe(true);

    expect(() => attribute.setValue('Inception 2')).toThrow(
      "Cannot set the value of a controlled attribute when the source is different than 'server' or 'store' (attribute: 'Movie.prototype.title', source: 'local')"
    );

    expect(attribute.getValue()).toBe('Inception');
  });

  test('Sanitization', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const {trim, compact} = sanitizers;

    const titleAttribute = new Attribute('title', movie, {
      valueType: 'string',
      sanitizers: [trim()]
    });

    titleAttribute.setValue('Inception');

    expect(titleAttribute.getValue()).toBe('Inception');

    titleAttribute.setValue('  Inception ');

    expect(titleAttribute.getValue()).toBe('Inception');

    const genresAttribute = new Attribute('genres', movie, {
      valueType: 'string[]',
      sanitizers: [compact()],
      items: {sanitizers: [trim()]}
    });

    genresAttribute.setValue(['drama', 'action']);

    expect(genresAttribute.getValue()).toStrictEqual(['drama', 'action']);

    genresAttribute.setValue(['drama ', ' action']);

    expect(genresAttribute.getValue()).toStrictEqual(['drama', 'action']);

    genresAttribute.setValue(['drama ', '']);

    expect(genresAttribute.getValue()).toStrictEqual(['drama']);

    genresAttribute.setValue(['', ' ']);

    expect(genresAttribute.getValue()).toStrictEqual([]);
  });

  test('Validation', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    let notEmpty = validators.notEmpty();
    let attribute = new Attribute('title', movie, {valueType: 'string?', validators: [notEmpty]});

    expect(() => attribute.runValidators()).toThrow(
      "Cannot run the validators of an unset attribute (attribute: 'Movie.prototype.title')"
    );

    attribute.setValue('Inception');

    expect(() => attribute.validate()).not.toThrow();
    expect(attribute.isValid()).toBe(true);
    expect(attribute.runValidators()).toEqual([]);

    attribute.setValue('');

    expect(() => attribute.validate()).toThrow(
      "The following error(s) occurred while validating the attribute 'title': The validator `notEmpty()` failed (path: '')"
    );
    expect(attribute.isValid()).toBe(false);
    expect(attribute.runValidators()).toEqual([{validator: notEmpty, path: ''}]);

    attribute.setValue(undefined);

    expect(() => attribute.validate()).toThrow(
      "The following error(s) occurred while validating the attribute 'title': The validator `notEmpty()` failed (path: '')"
    );
    expect(attribute.isValid()).toBe(false);
    expect(attribute.runValidators()).toEqual([{validator: notEmpty, path: ''}]);

    // --- With a custom message ---

    notEmpty = validators.notEmpty('The title cannot be empty.');
    attribute = new Attribute('title', movie, {valueType: 'string?', validators: [notEmpty]});

    attribute.setValue('Inception');

    expect(() => attribute.validate()).not.toThrow();

    attribute.setValue('');

    let error: ExtendedError;

    try {
      attribute.validate();
    } catch (err: any) {
      error = err;
    }

    expect(error!.message).toBe(
      "The following error(s) occurred while validating the attribute 'title': The title cannot be empty. (path: '')"
    );

    expect(error!.displayMessage).toBe('The title cannot be empty.');
  });

  test('Observability', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const movieObserver = jest.fn();
    movie.addObserver(movieObserver);

    const titleAttribute = new Attribute('title', movie, {valueType: 'string'});

    const titleObserver = jest.fn();
    titleAttribute.addObserver(titleObserver);

    expect(titleObserver).toHaveBeenCalledTimes(0);
    expect(movieObserver).toHaveBeenCalledTimes(0);

    titleAttribute.setValue('Inception');

    expect(titleObserver).toHaveBeenCalledTimes(1);
    expect(movieObserver).toHaveBeenCalledTimes(1);

    titleAttribute.setValue('Inception 2');

    expect(titleObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    titleAttribute.setValue('Inception 2');

    // Assigning the same value should not call the observers
    expect(titleObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    const tagsAttribute = new Attribute('title', movie, {valueType: 'string[]'});

    const tagsObserver = jest.fn();
    tagsAttribute.addObserver(tagsObserver);

    expect(tagsObserver).toHaveBeenCalledTimes(0);
    expect(movieObserver).toHaveBeenCalledTimes(2);

    tagsAttribute.setValue(['drama', 'action']);

    expect(tagsObserver).toHaveBeenCalledTimes(1);
    expect(movieObserver).toHaveBeenCalledTimes(3);

    const tagArray = tagsAttribute.getValue() as string[];

    tagArray[0] = 'Drama';

    expect(tagsObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(4);

    tagArray[0] = 'Drama';

    // Assigning the same value should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(2);
    expect(movieObserver).toHaveBeenCalledTimes(4);

    tagsAttribute.setValue(['Drama', 'Action']);

    expect(tagsObserver).toHaveBeenCalledTimes(3);
    expect(movieObserver).toHaveBeenCalledTimes(5);

    const newTagArray = tagsAttribute.getValue() as string[];

    newTagArray[0] = 'drama';

    expect(tagsObserver).toHaveBeenCalledTimes(4);
    expect(movieObserver).toHaveBeenCalledTimes(6);

    tagArray[0] = 'DRAMA';

    // Modifying the previous array should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(4);
    expect(movieObserver).toHaveBeenCalledTimes(6);

    tagsAttribute.unsetValue();

    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    tagsAttribute.unsetValue();

    // Calling unset again should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    newTagArray[0] = 'drama';

    // Modifying the detached array should not call the observers
    expect(tagsObserver).toHaveBeenCalledTimes(5);
    expect(movieObserver).toHaveBeenCalledTimes(7);

    // --- With an embedded component ---

    class UserDetails extends EmbeddedComponent {}

    const userDetails = new UserDetails();

    const countryAttribute = new Attribute('country', userDetails, {valueType: 'string'});

    class User extends Component {}

    User.provideComponent(UserDetails);

    let user = new User();

    let userObserver = jest.fn();
    user.addObserver(userObserver);

    const detailsAttribute = new Attribute('details', user, {valueType: 'UserDetails?'});

    expect(userObserver).toHaveBeenCalledTimes(0);

    detailsAttribute.setValue(userDetails);

    expect(userObserver).toHaveBeenCalledTimes(1);

    countryAttribute.setValue('Japan');

    expect(userObserver).toHaveBeenCalledTimes(2);

    detailsAttribute.setValue(undefined);

    expect(userObserver).toHaveBeenCalledTimes(3);

    countryAttribute.setValue('France');

    expect(userObserver).toHaveBeenCalledTimes(3);

    // --- With an array of embedded components ---

    class Organization extends EmbeddedComponent {}

    const organization = new Organization();

    const organizationNameAttribute = new Attribute('name', organization, {valueType: 'string'});

    User.provideComponent(Organization);

    user = new User();

    userObserver = jest.fn();
    user.addObserver(userObserver);

    const organizationsAttribute = new Attribute('organizations', user, {
      valueType: 'Organization[]'
    });

    expect(userObserver).toHaveBeenCalledTimes(0);

    organizationsAttribute.setValue([]);

    expect(userObserver).toHaveBeenCalledTimes(1);

    (organizationsAttribute.getValue() as Organization[]).push(organization);

    expect(userObserver).toHaveBeenCalledTimes(2);

    organizationNameAttribute.setValue('The Inc.');

    expect(userObserver).toHaveBeenCalledTimes(3);

    (organizationsAttribute.getValue() as Organization[]).pop();

    expect(userObserver).toHaveBeenCalledTimes(5);

    organizationNameAttribute.setValue('Nice Inc.');

    expect(userObserver).toHaveBeenCalledTimes(5);

    // --- With a referenced component ---

    class Blog extends Component {}

    const blog = new Blog();

    const blogNameAttribute = new Attribute('name', blog, {valueType: 'string'});

    class Article extends Component {}

    Article.provideComponent(Blog);

    let article = new Article();

    let articleObserver = jest.fn();
    article.addObserver(articleObserver);

    const blogAttribute = new Attribute('blog', article, {valueType: 'Blog?'});

    expect(articleObserver).toHaveBeenCalledTimes(0);

    blogAttribute.setValue(blog);

    expect(articleObserver).toHaveBeenCalledTimes(1);

    blogNameAttribute.setValue('My Blog');

    expect(articleObserver).toHaveBeenCalledTimes(1);

    blogAttribute.setValue(undefined);

    expect(articleObserver).toHaveBeenCalledTimes(2);

    blogNameAttribute.setValue('The Blog');

    expect(articleObserver).toHaveBeenCalledTimes(2);

    // --- With an array of referenced components ---

    class Comment extends Component {}

    const comment = new Comment();

    const commentTextAttribute = new Attribute('text', comment, {valueType: 'string'});

    Article.provideComponent(Comment);

    article = new Article();

    articleObserver = jest.fn();
    article.addObserver(articleObserver);

    const commentsAttribute = new Attribute('comments', article, {valueType: 'Comment[]'});

    expect(articleObserver).toHaveBeenCalledTimes(0);

    commentsAttribute.setValue([]);

    expect(articleObserver).toHaveBeenCalledTimes(1);

    (commentsAttribute.getValue() as Comment[]).push(comment);

    expect(articleObserver).toHaveBeenCalledTimes(2);

    commentTextAttribute.setValue('Hello');

    expect(articleObserver).toHaveBeenCalledTimes(2);

    (commentsAttribute.getValue() as Comment[]).pop();

    expect(articleObserver).toHaveBeenCalledTimes(4);

    commentTextAttribute.setValue('Hey');

    expect(articleObserver).toHaveBeenCalledTimes(4);
  });

  test('Forking', async () => {
    class Movie extends Component {}

    const movie = new Movie();

    const attribute = new Attribute('title', movie, {valueType: 'string'});
    attribute.setValue('Inception');

    expect(attribute.getValue()).toBe('Inception');

    const movieFork = Object.create(movie);
    const attributeFork = attribute.fork(movieFork);

    expect(attributeFork.getValue()).toBe('Inception');

    attributeFork.setValue('Inception 2');

    expect(attributeFork.getValue()).toBe('Inception 2');
    expect(attribute.getValue()).toBe('Inception');
  });

  test('Introspection', async () => {
    class Movie extends Component {}

    expect(
      new Attribute('limit', Movie, {valueType: 'number', exposure: {get: true}}).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'Attribute',
      exposure: {get: true},
      valueType: 'number'
    });

    expect(
      new Attribute('limit', Movie, {
        valueType: 'number',
        value: 100,
        exposure: {set: true}
      }).introspect()
    ).toStrictEqual({name: 'limit', type: 'Attribute', exposure: {set: true}, valueType: 'number'});

    expect(
      new Attribute('limit', Movie, {
        valueType: 'number',
        value: 100,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'limit',
      type: 'Attribute',
      value: 100,
      exposure: {get: true},
      valueType: 'number'
    });

    const defaultTitle = function () {
      return '';
    };

    expect(
      new Attribute('title', Movie.prototype, {
        valueType: 'string',
        default: defaultTitle,
        exposure: {get: true, set: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'Attribute',
      default: defaultTitle,
      exposure: {get: true, set: true},
      valueType: 'string'
    });

    // When 'set' is not exposed, the default value should not be exposed
    expect(
      new Attribute('title', Movie.prototype, {
        valueType: 'string',
        default: defaultTitle,
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'Attribute',
      exposure: {get: true},
      valueType: 'string'
    });

    const notEmpty = validators.notEmpty();

    expect(
      new Attribute('title', Movie.prototype, {
        valueType: 'string?',
        validators: [notEmpty],
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'title',
      type: 'Attribute',
      valueType: 'string?',
      exposure: {get: true},
      validators: [notEmpty]
    });

    expect(
      new Attribute('tags', Movie.prototype, {
        valueType: 'string[]',
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[]',
      exposure: {get: true}
    });

    expect(
      new Attribute('tags', Movie.prototype, {
        valueType: 'string[]',
        items: {validators: [notEmpty]},
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[]',
      items: {
        validators: [notEmpty]
      },
      exposure: {get: true}
    });

    expect(
      new Attribute('tags', Movie.prototype, {
        valueType: 'string[][]',
        items: {items: {validators: [notEmpty]}},
        exposure: {get: true}
      }).introspect()
    ).toStrictEqual({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[][]',
      items: {
        items: {
          validators: [notEmpty]
        }
      },
      exposure: {get: true}
    });
  });

  test('Unintrospection', async () => {
    class Movie extends Component {}

    let {name, options} = Attribute.unintrospect({
      name: 'limit',
      type: 'Attribute',
      valueType: 'number',
      exposure: {get: true}
    });

    expect({name, options}).toEqual({
      name: 'limit',
      options: {valueType: 'number', exposure: {get: true}}
    });
    expect(() => new Attribute(name, Movie, options)).not.toThrow();

    ({name, options} = Attribute.unintrospect({
      name: 'limit',
      type: 'Attribute',
      valueType: 'number',
      value: 100,
      exposure: {get: true}
    }));

    expect({name, options}).toEqual({
      name: 'limit',
      options: {valueType: 'number', value: 100, exposure: {get: true}}
    });
    expect(() => new Attribute(name, Movie, options)).not.toThrow();

    const defaultTitle = function () {
      return '';
    };

    ({name, options} = Attribute.unintrospect({
      name: 'title',
      type: 'Attribute',
      valueType: 'string',
      default: defaultTitle,
      exposure: {get: true, set: true}
    }));

    expect({name, options}).toEqual({
      name: 'title',
      options: {valueType: 'string', default: defaultTitle, exposure: {get: true, set: true}}
    });
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();

    const notEmptyValidator = validators.notEmpty();

    ({name, options} = Attribute.unintrospect({
      name: 'title',
      type: 'Attribute',
      valueType: 'string?',
      validators: [notEmptyValidator],
      exposure: {get: true}
    }));

    expect(name).toBe('title');
    expect(options.valueType).toBe('string?');
    expect(options.validators).toEqual([notEmptyValidator]);
    expect(options.exposure).toEqual({get: true});
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();

    ({name, options} = Attribute.unintrospect({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[]',
      items: {
        validators: [notEmptyValidator]
      },
      exposure: {get: true}
    }));

    expect(name).toBe('tags');
    expect(options.valueType).toBe('string[]');
    expect(options.validators).toBeUndefined();
    expect(options.items!.validators).toEqual([notEmptyValidator]);
    expect(options.exposure).toEqual({get: true});
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();

    ({name, options} = Attribute.unintrospect({
      name: 'tags',
      type: 'Attribute',
      valueType: 'string[][]',
      items: {
        items: {
          validators: [notEmptyValidator]
        }
      },
      exposure: {get: true}
    }));

    expect(name).toBe('tags');
    expect(options.valueType).toBe('string[][]');
    expect(options.validators).toBeUndefined();
    expect(options.items!.validators).toBeUndefined();
    expect(options.items!.items!.validators).toEqual([notEmptyValidator]);
    expect(options.exposure).toEqual({get: true});
    expect(() => new Attribute(name, Movie.prototype, options)).not.toThrow();
  });
});
