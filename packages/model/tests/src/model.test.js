import {Model, isModelClass, isModel, field, isField, method, validators} from '../../..';

describe('Model', () => {
  test('Creation', async () => {
    class Movie extends Model() {
      @field('string') title;
      @field('string?') country;
      @field('number') rating = 0;
    }

    const movie = new Movie({title: 'Inception'});

    expect(isModelClass(Movie)).toBe(true);
    expect(movie.getField('title').hasValue()).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.getField('country').hasValue()).toBe(true);
    expect(movie.country).toBeUndefined();
    expect(movie.getField('rating').hasValue()).toBe(true);
    expect(movie.rating).toBe(0);

    expect(() => new Movie()).toThrow(
      "Cannot assign a value of an unexpected type to the field 'title' (expected type: 'string', received type: 'undefined')"
    );
  });

  test('isModelClass()', async () => {
    expect(isModelClass(undefined)).toBe(false);
    expect(isModelClass(null)).toBe(false);
    expect(isModelClass(true)).toBe(false);
    expect(isModelClass(1)).toBe(false);
    expect(isModelClass({})).toBe(false);

    class Movie extends Model() {}

    expect(isModelClass(Movie)).toBe(true);
    expect(isModelClass(Movie.prototype)).toBe(false);

    const movie = new Movie();

    expect(isModelClass(movie)).toBe(false);
  });

  test('isModel()', async () => {
    expect(isModel(undefined)).toBe(false);
    expect(isModel(null)).toBe(false);
    expect(isModel(true)).toBe(false);
    expect(isModel(1)).toBe(false);
    expect(isModel({})).toBe(false);

    class Movie extends Model() {}

    expect(isModel(Movie.prototype)).toBe(true);

    const movie = new Movie();

    expect(isModel(movie)).toBe(true);
  });

  test('getField()', async () => {
    class Movie extends Model() {
      @field('number') static limit = 100;

      @method() static find() {}

      @field('string') title = '';
    }

    const classField = Movie.getField('limit');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('limit');
    expect(classField.getParent()).toBe(Movie);

    expect(() => Movie.getField('find')).toThrow(
      "The property 'find' exists, but it is not a field"
    );

    const prototypeField = Movie.prototype.getField('title');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('title');
    expect(prototypeField.getParent()).toBe(Movie.prototype);

    expect(() => Movie.getField('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getField('offset', {throwIfMissing: false})).toBeUndefined();
  });

  test('setField()', async () => {
    class Movie extends Model() {
      @method() static find() {}
    }

    expect(Movie.hasField('limit')).toBe(false);

    let setFieldResult = Movie.setField('limit', {valueType: 'number'});

    expect(Movie.hasField('limit')).toBe(true);

    let field = Movie.getField('limit');

    expect(field).toBe(setFieldResult);
    expect(isField(field)).toBe(true);
    expect(field.getName()).toBe('limit');
    expect(field.getParent()).toBe(Movie);

    expect(() => Movie.setField('find', {valueType: 'number'})).toThrow(
      "Cannot change the type of the 'find' property"
    );

    class Film extends Movie {}

    expect(Film.hasField('limit')).toBe(true);

    setFieldResult = Film.setField('limit', {valueType: 'number'});

    expect(Film.hasField('limit')).toBe(true);

    field = Film.getField('limit');

    expect(field).toBe(setFieldResult);
    expect(isField(field)).toBe(true);
    expect(field.getName()).toBe('limit');
    expect(field.getParent()).toBe(Film);

    expect(() => Film.setField('find', {valueType: 'number'})).toThrow(
      "Cannot change the type of the 'find' property"
    );
  });

  test('hasField()', async () => {
    class Movie extends Model() {
      @field('number') static limit = 100;

      @method() static find() {}
    }

    expect(Movie.hasField('limit')).toBe(true);
    expect(Movie.hasField('offset')).toBe(false);
    expect(Movie.prototype.hasField('limit')).toBe(false);

    expect(() => Movie.hasField('find')).toThrow(
      "The property 'find' exists, but it is not a field"
    );
  });

  test('getFields()', async () => {
    class Movie extends Model() {
      @field('string') title = '';
      @field('number') duration = 0;

      @method() load() {}
      @method() save() {}
    }

    const movie = new Movie();

    let fields = movie.getFields();

    expect(typeof fields[Symbol.iterator]).toBe('function');
    expect(Array.from(fields).map(property => property.getName())).toEqual(['title', 'duration']);

    const classFields = Movie.getFields();

    expect(typeof classFields[Symbol.iterator]).toBe('function');
    expect(Array.from(classFields)).toHaveLength(0);

    class Film extends Movie {
      @field('Director?') director;
    }

    const film = new Film();

    fields = film.getFields();

    expect(typeof fields[Symbol.iterator]).toBe('function');
    expect(Array.from(fields).map(property => property.getName())).toEqual([
      'title',
      'duration',
      'director'
    ]);

    fields = film.getFields({
      filter(property) {
        expect(property.getParent() === this);
        return property.getName() !== 'duration';
      }
    });

    expect(typeof fields[Symbol.iterator]).toBe('function');
    expect(Array.from(fields).map(property => property.getName())).toEqual(['title', 'director']);
  });

  test('@field()', async () => {
    class Movie extends Model() {
      @field('number?') static limit = 100;
      @field('string?') static token;

      @field('string?') title = '';
      @field('string?') country;
    }

    let classField = Movie.getField('limit');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('limit');
    expect(classField.getParent()).toBe(Movie);
    expect(classField.getValue()).toBe(100);
    expect(Movie.limit).toBe(100);

    classField = Movie.getField('token');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('token');
    expect(classField.getParent()).toBe(Movie);
    expect(classField.getValue()).toBeUndefined();
    expect(Movie.token).toBeUndefined();

    let prototypeField = Movie.prototype.getField('title');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('title');
    expect(prototypeField.getParent()).toBe(Movie.prototype);
    expect(prototypeField.hasValue()).toBe(false);

    prototypeField = Movie.prototype.getField('country');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('country');
    expect(prototypeField.getParent()).toBe(Movie.prototype);
    expect(prototypeField.hasValue()).toBe(false);

    const movie = new Movie();

    let instanceField = movie.getField('title');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('title');
    expect(instanceField.getParent()).toBe(movie);
    expect(instanceField.getValue()).toBe('');
    expect(movie.title).toBe('');

    instanceField = movie.getField('country');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('country');
    expect(instanceField.getParent()).toBe(movie);
    expect(instanceField.getValue()).toBeUndefined();
    expect(movie.country).toBeUndefined();

    expect(() => Movie.getField('offset')).toThrow("The property 'offset' is missing");
    expect(Movie.getField('offset', {throwIfMissing: false})).toBeUndefined();

    expect(
      () =>
        class Film extends Movie {
          @field('string') static find() {}
        }
    ).toThrow("@field() cannot be used without a field declaration (property name: 'find')");

    class Film extends Movie {
      @field('number?') static limit;
      @field('string?') static token = '';

      @field('string?') title;
      @field('string?') country = '';
    }

    classField = Film.getField('limit');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('limit');
    expect(classField.getParent()).toBe(Film);
    expect(classField.getValue()).toBeUndefined();
    expect(Film.limit).toBeUndefined();

    classField = Film.getField('token');

    expect(isField(classField)).toBe(true);
    expect(classField.getName()).toBe('token');
    expect(classField.getParent()).toBe(Film);
    expect(classField.getValue()).toBe('');
    expect(Film.token).toBe('');

    prototypeField = Film.prototype.getField('title');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('title');
    expect(prototypeField.getParent()).toBe(Film.prototype);
    expect(prototypeField.hasValue()).toBe(false);

    prototypeField = Film.prototype.getField('country');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('country');
    expect(prototypeField.getParent()).toBe(Film.prototype);
    expect(prototypeField.hasValue()).toBe(false);

    const film = new Film();

    instanceField = film.getField('title');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('title');
    expect(instanceField.getParent()).toBe(film);
    expect(instanceField.getValue()).toBeUndefined();
    expect(film.title).toBeUndefined();

    instanceField = film.getField('country');

    expect(isField(instanceField)).toBe(true);
    expect(instanceField.getName()).toBe('country');
    expect(instanceField.getParent()).toBe(film);
    expect(instanceField.getValue()).toBe('');
    expect(film.country).toBe('');
  });

  test('Validation', async () => {
    const notEmpty = validators.notEmpty();
    const maxLength = validators.maxLength(3);

    class Movie extends Model() {
      @field('string', {validators: [notEmpty]}) title = '';
      @field('[string]', {validators: [maxLength], items: {validators: [notEmpty]}}) tags = [];
      @field('person?') director;
      @field('[person]') actors = [];
    }

    class Person extends Model() {
      @field('string', {validators: [notEmpty]}) name = '';
    }

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
