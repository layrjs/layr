import {
  Model,
  isModelClass,
  isModelInstance,
  attribute,
  isModelAttribute,
  method,
  validators
} from '../../..';

describe('Model', () => {
  test('Creation', async () => {
    class Movie extends Model {
      @attribute('string') title;
      @attribute('string?') country;
      @attribute('number') rating = 0;
    }

    const movie = new Movie({title: 'Inception'});

    expect(isModelClass(Movie)).toBe(true);
    expect(movie.getModelAttribute('title').isSet()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.getModelAttribute('country').isSet()).toBe(true);
    expect(movie.country).toBeUndefined();
    expect(movie.getModelAttribute('rating').isSet()).toBe(true);
    expect(movie.rating).toBe(0);

    expect(() => new Movie()).toThrow(
      "Cannot assign a value of an unexpected type (model name: 'movie', attribute name: 'title', expected type: 'string', received type: 'undefined')"
    );
  });

  test('isModelClass()', async () => {
    expect(isModelClass(undefined)).toBe(false);
    expect(isModelClass(null)).toBe(false);
    expect(isModelClass(true)).toBe(false);
    expect(isModelClass(1)).toBe(false);
    expect(isModelClass({})).toBe(false);

    class Movie extends Model {}

    expect(isModelClass(Movie)).toBe(true);
    expect(isModelClass(Movie.prototype)).toBe(false);

    const movie = new Movie();

    expect(isModelClass(movie)).toBe(false);
  });

  test('isModelInstance()', async () => {
    expect(isModelInstance(undefined)).toBe(false);
    expect(isModelInstance(null)).toBe(false);
    expect(isModelInstance(true)).toBe(false);
    expect(isModelInstance(1)).toBe(false);
    expect(isModelInstance({})).toBe(false);

    class Movie extends Model {}

    expect(isModelInstance(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isModelInstance(movie)).toBe(true);
  });

  test('getModelAttribute()', async () => {
    class Movie extends Model {
      @attribute('number') static limit = 100;

      @method() static find() {}

      @attribute('string') title = '';
    }

    const classModelAttribute = Movie.getModelAttribute('limit');

    expect(isModelAttribute(classModelAttribute)).toBe(true);
    expect(classModelAttribute.getName()).toBe('limit');
    expect(classModelAttribute.getParent()).toBe(Movie);

    expect(() => Movie.getModelAttribute('find')).toThrow(
      "A property with the specified name was found, but it is not a model attribute (model name: 'Movie', method name: 'find')"
    );

    const prototypeModelAttribute = Movie.prototype.getModelAttribute('title');

    expect(isModelAttribute(prototypeModelAttribute)).toBe(true);
    expect(prototypeModelAttribute.getName()).toBe('title');
    expect(prototypeModelAttribute.getParent()).toBe(Movie.prototype);

    expect(() => Movie.getModelAttribute('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getModelAttribute('offset', {throwIfMissing: false})).toBeUndefined();
  });

  test('setModelAttribute()', async () => {
    class Movie extends Model {
      @method() static find() {}
    }

    expect(Movie.hasModelAttribute('limit')).toBe(false);

    let setModelAttributeResult = Movie.setModelAttribute('limit', {type: 'number'});

    expect(Movie.hasModelAttribute('limit')).toBe(true);

    let modelAttribute = Movie.getModelAttribute('limit');

    expect(modelAttribute).toBe(setModelAttributeResult);
    expect(isModelAttribute(modelAttribute)).toBe(true);
    expect(modelAttribute.getName()).toBe('limit');
    expect(modelAttribute.getParent()).toBe(Movie);

    expect(() => Movie.setModelAttribute('find', {type: 'number'})).toThrow(
      "Cannot change the type of a property (model name: 'Movie', method name: 'find')"
    );

    class Film extends Movie {}

    expect(Film.hasModelAttribute('limit')).toBe(true);

    setModelAttributeResult = Film.setModelAttribute('limit', {type: 'number'});

    expect(Film.hasModelAttribute('limit')).toBe(true);

    modelAttribute = Film.getModelAttribute('limit');

    expect(modelAttribute).toBe(setModelAttributeResult);
    expect(isModelAttribute(modelAttribute)).toBe(true);
    expect(modelAttribute.getName()).toBe('limit');
    expect(modelAttribute.getParent()).toBe(Film);

    expect(() => Film.setModelAttribute('find', {type: 'number'})).toThrow(
      "Cannot change the type of a property (model name: 'Film', method name: 'find')"
    );
  });

  test('hasModelAttribute()', async () => {
    class Movie extends Model {
      @attribute('number') static limit = 100;

      @method() static find() {}
    }

    expect(Movie.hasModelAttribute('limit')).toBe(true);
    expect(Movie.hasModelAttribute('offset')).toBe(false);
    expect(Movie.prototype.hasModelAttribute('limit')).toBe(false);

    expect(() => Movie.hasModelAttribute('find')).toThrow(
      "A property with the specified name was found, but it is not a model attribute (model name: 'Movie', method name: 'find')"
    );
  });

  test('getModelAttributes()', async () => {
    class Movie extends Model {
      @attribute('string') title = '';
      @attribute('number') duration = 0;

      @method() load() {}
      @method() save() {}
    }

    const movie = new Movie();

    let modelAttributes = movie.getModelAttributes();

    expect(typeof modelAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(modelAttributes).map(property => property.getName())).toEqual([
      'title',
      'duration'
    ]);

    const classModelAttributes = Movie.getModelAttributes();

    expect(typeof classModelAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(classModelAttributes)).toHaveLength(0);

    class Film extends Movie {
      @attribute('Director?') director;
    }

    const film = new Film();

    modelAttributes = film.getModelAttributes();

    expect(typeof modelAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(modelAttributes).map(property => property.getName())).toEqual([
      'title',
      'duration',
      'director'
    ]);

    modelAttributes = film.getModelAttributes({
      filter(property) {
        expect(property.getParent() === this);
        return property.getName() !== 'duration';
      }
    });

    expect(typeof modelAttributes[Symbol.iterator]).toBe('function');
    expect(Array.from(modelAttributes).map(property => property.getName())).toEqual([
      'title',
      'director'
    ]);
  });

  test('expandAttributeSelector()', async () => {
    class Movie extends Model {
      @attribute('string') title = '';
      @attribute('number') duration = 0;
      @attribute('person?') director;
      @attribute('[person]') actors = [];
    }

    class Person extends Model {
      @attribute('string') name = '';
    }

    Movie.registerRelatedComponent(Person);

    expect(Movie.prototype.expandAttributeSelector(true)).toStrictEqual({
      title: true,
      duration: true,
      director: {name: true},
      actors: {name: true}
    });

    expect(Movie.prototype.expandAttributeSelector(true, {depth: 0})).toStrictEqual({
      title: true,
      duration: true,
      director: true,
      actors: true
    });
  });

  test('Validation', async () => {
    const notEmpty = validators.notEmpty();
    const maxLength = validators.maxLength(3);

    class Movie extends Model {
      @attribute('string', {validators: [notEmpty]}) title = '';
      @attribute('[string]', {validators: [maxLength], items: {validators: [notEmpty]}}) tags = [];
      @attribute('person?') director;
      @attribute('[person]') actors = [];
    }

    class Person extends Model {
      @attribute('string', {validators: [notEmpty]}) name = '';
    }

    Movie.registerRelatedComponent(Person);

    const movie = new Movie();

    expect(() => movie.validate()).toThrow(
      "The following error(s) occurred while validating the model 'movie': The validator `notEmpty()` failed (path: 'title')"
    );
    expect(movie.isValid()).toBe(false);
    expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'title'}]);

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
      "The following error(s) occurred while validating the model 'movie': The validator `notEmpty()` failed (path: 'tags[2]')"
    );
    expect(movie.isValid()).toBe(false);
    expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'tags[2]'}]);

    movie.tags.push('sci-fi');

    expect(() => movie.validate()).toThrow(
      "The following error(s) occurred while validating the model 'movie': The validator `maxLength(3)` failed (path: 'tags'), The validator `notEmpty()` failed (path: 'tags[2]')"
    );
    expect(movie.isValid()).toBe(false);
    expect(movie.runValidators()).toEqual([
      {validator: maxLength, path: 'tags'},
      {validator: notEmpty, path: 'tags[2]'}
    ]);

    movie.tags.splice(2, 1);

    movie.director = new Person();

    expect(() => movie.validate()).toThrow(
      "The following error(s) occurred while validating the model 'movie': The validator `notEmpty()` failed (path: 'director.name')"
    );
    expect(movie.isValid()).toBe(false);
    expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'director.name'}]);

    movie.director.name = 'Christopher Nolan';

    expect(() => movie.validate()).not.toThrow();
    expect(movie.isValid()).toBe(true);
    expect(movie.runValidators()).toEqual([]);

    movie.actors.push(new Person());

    expect(() => movie.validate()).toThrow(
      "The following error(s) occurred while validating the model 'movie': The validator `notEmpty()` failed (path: 'actors[0].name')"
    );
    expect(movie.isValid()).toBe(false);
    expect(movie.runValidators()).toEqual([{validator: notEmpty, path: 'actors[0].name'}]);

    movie.actors[0].name = 'Leonardo DiCaprio';

    expect(() => movie.validate()).not.toThrow();
    expect(movie.isValid()).toBe(true);
    expect(movie.runValidators()).toEqual([]);
  });
});
