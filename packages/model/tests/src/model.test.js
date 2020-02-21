import {Model, isModel, field, isField, method} from '../../..';

describe('Model', () => {
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
      @field('Director') director;
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
      @field('number') static limit = 100;
      @field('string') static token;

      @field('string') title = '';
      @field('string') country;
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
    expect(prototypeField.isActive()).toBe(false);

    prototypeField = Movie.prototype.getField('country');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('country');
    expect(prototypeField.getParent()).toBe(Movie.prototype);
    expect(prototypeField.isActive()).toBe(false);

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
      @field('number') static limit;
      @field('string') static token = '';

      @field('string') title;
      @field('string') country = '';
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
    expect(prototypeField.isActive()).toBe(false);

    prototypeField = Film.prototype.getField('country');

    expect(isField(prototypeField)).toBe(true);
    expect(prototypeField.getName()).toBe('country');
    expect(prototypeField.getParent()).toBe(Film.prototype);
    expect(prototypeField.isActive()).toBe(false);

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
});
