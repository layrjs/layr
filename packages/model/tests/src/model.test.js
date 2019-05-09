import {Registry} from '@storable/registry';

import {Model, field, validators, createValidator} from '../../..';

const {notEmpty, maxLength, greaterThanOrEqual} = validators;

describe('Model', () => {
  test('Basic fields', () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;
    }

    const registry = new Registry('frontend', {register: {Movie}});

    let movie = new registry.Movie({title: 'Inception', year: 2010});
    expect(movie instanceof registry.Movie).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);

    movie.title = 'The Matrix';
    expect(movie.title).toBe('The Matrix');
    movie.year = 1999;
    expect(movie.year).toBe(1999);

    movie = new registry.Movie({title: 'Forrest Gump', unknownField: 'abc'});
    expect(movie.title).toBe('Forrest Gump');
    expect(movie.unknownField).toBeUndefined(); // Silently ignore undefined fields
  });

  test('Date field', () => {
    class Movie extends Model {
      @field('string') title;

      @field('Date') releasedOn;
    }

    const registry = new Registry('frontend', {register: {Movie}});

    const movie = new registry.Movie({
      title: 'Inception',
      releasedOn: new Date(Date.UTC(2010, 6, 16))
    });
    expect(movie.title).toBe('Inception');
    expect(movie.releasedOn.getUTCFullYear()).toBe(2010);
    expect(movie.releasedOn.getUTCMonth()).toBe(6);
    expect(movie.releasedOn.getUTCDate()).toBe(16);
  });

  test('Array field', () => {
    class Movie extends Model {
      @field('string') title;

      @field('string[]') genres;

      @field('Actor[]') actors;
    }

    class Actor extends Model {
      @field('string') fullName;
    }

    const registry = new Registry('frontend', {register: {Movie, Actor}});

    let movie = new registry.Movie();
    expect(movie.genres).toEqual([]);
    expect(movie.actors).toEqual([]);

    movie = new registry.Movie({
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      actors: [{fullName: 'Leonardo DiCaprio'}, {fullName: 'Joseph Gordon-Levitt'}]
    });
    expect(movie.title).toBe('Inception');
    expect(movie.genres).toEqual(['action', 'adventure', 'sci-fi']);
    expect(movie.actors.length).toBe(2);
    expect(movie.actors[0] instanceof registry.Actor).toBe(true);
    expect(movie.actors[0].fullName).toBe('Leonardo DiCaprio');
    expect(movie.actors[1] instanceof registry.Actor).toBe(true);
    expect(movie.actors[1].fullName).toBe('Joseph Gordon-Levitt');
  });

  test('Type checking', () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;

      @field('string[]') genres;
    }

    const registry = new Registry('frontend', {register: {Movie}});

    const movie = new registry.Movie();

    expect(() => {
      movie.title = 123;
    }).toThrow(/Type mismatch/);

    expect(() => {
      movie.year = '1999';
    }).toThrow(/Type mismatch/);

    expect(() => {
      movie.genres = 'action';
    }).toThrow(/Type mismatch/);

    expect(() => {
      movie.genres = [123];
    }).toThrow(/Type mismatch/);
  });

  test('Default values', () => {
    class Movie extends Model {
      @field('string') title;

      @field('boolean') isRestricted = false;
    }

    const registry = new Registry('frontend', {register: {Movie}});

    let movie = new registry.Movie();
    expect(movie.title).toBeUndefined();
    expect(movie.isRestricted).toBe(false);

    movie = new registry.Movie({title: 'Inception', isRestricted: true});
    expect(movie.title).toBe('Inception');
    expect(movie.isRestricted).toBe(true);
  });

  test('Inheritance', () => {
    class Item extends Model {
      @field('string') id;
    }

    class Movie extends Item {
      @field('string') title;
    }

    expect(() => {
      return class Actor extends Item {
        @field('string') id; // Cannot add a property that already exists
      };
    }).toThrow(/Field already exists/);

    const registry = new Registry('frontend', {register: {Movie}});

    const movie = new registry.Movie({id: 'abc123', title: 'Inception'});
    expect(movie.id).toBe('abc123');
    expect(movie.title).toBe('Inception');
  });

  test('Validation', () => {
    class Movie extends Model {
      @field('string', {validators: [notEmpty(), maxLength(40)]}) title;

      @field('number?', {validators: [greaterThanOrEqual(1900)]}) year;

      @field('string[]', {validators: [maxLength(3), [notEmpty()]]}) genres;

      @field('string?', {
        validators: [
          createValidator(
            'startsWithUpperCase',
            value => value.slice(0, 1) === value.slice(0, 1).toUpperCase()
          )
        ]
      })
      director;
    }

    const registry = new Registry('frontend', {register: {Movie}});

    let movie = new registry.Movie();
    expect(movie.getFailedValidators()).toEqual({title: ['required()']});
    movie.title = '';
    expect(movie.getFailedValidators()).toEqual({title: ['notEmpty()']});
    movie.title = '12345678901234567890123456789012345678901';
    expect(movie.getFailedValidators()).toEqual({title: ['maxLength(40)']});
    movie.title = '1234567890123456789012345678901234567890';
    expect(movie.getFailedValidators()).toBeUndefined();

    movie.year = 1899;
    expect(movie.getFailedValidators()).toEqual({year: ['greaterThanOrEqual(1900)']});
    movie.year = 1900;
    expect(movie.getFailedValidators()).toBeUndefined();

    movie.genres = ['action', 'adventure', 'sci-fi', 'drama'];
    expect(movie.getFailedValidators()).toEqual({genres: ['maxLength(3)']});
    movie.genres = ['action', '', 'sci-fi'];
    expect(movie.getFailedValidators()).toEqual({genres: [[undefined, ['notEmpty()'], undefined]]});
    movie.genres = ['action', 'adventure', 'sci-fi'];
    expect(movie.getFailedValidators()).toBeUndefined();

    movie.director = 'christopher nolan';
    expect(movie.getFailedValidators()).toEqual({director: ['startsWithUpperCase()']});
    movie.director = 'Christopher Nolan';
    expect(movie.getFailedValidators()).toBeUndefined();

    movie = new registry.Movie({
      title: '',
      year: 1899,
      genres: ['action', 'adventure', '', 'drama'],
      director: 'christopher nolan'
    });
    expect(movie.getFailedValidators()).toEqual({
      title: ['notEmpty()'],
      year: ['greaterThanOrEqual(1900)'],
      genres: ['maxLength(3)', [undefined, undefined, ['notEmpty()'], undefined]],
      director: ['startsWithUpperCase()']
    });

    expect(movie.isValid()).toBe(false);
    expect(() => {
      movie.validate();
    }).toThrow(/Model validation failed/);

    movie = new registry.Movie({title: 'Inception'});
    expect(movie.isValid()).toBe(true);
    expect(() => movie.validate()).not.toThrow();
  });

  // test('Commit and rollback', () => {
  //   class Movie extends Model {
  //     @field('string') title;
  //   }

  //   const registry = new Registry('frontend', {register: {Movie}});

  //   let movie = new registry.Movie({title: 'Inception'});
  //   expect(movie.isChanged()).toBe(true); // Models created with `new' are considered as changed

  //   movie = registry.Movie.deserialize({title: 'Inception'});
  //   expect(movie.isChanged()).toBe(false); // Deserialized models are considered as unchanged

  //   movie.title = 'The Matrix';
  //   expect(movie.isChanged()).toBe(true);

  //   movie.commit();
  //   expect(movie.isChanged()).toBe(false);

  //   movie.title = 'Inception';
  //   expect(movie.isChanged()).toBe(true);

  //   movie.rollback();
  //   expect(movie.title).toBe('The Matrix');
  //   expect(movie.isChanged()).toBe(false);
  // });

  test('isNew()', () => {
    class Movie extends Model {
      @field('string') title;
    }

    const registry = new Registry('frontend', {register: {Movie}});

    let movie = new registry.Movie({title: 'Inception'});
    expect(movie.isNew()).toBe(true);

    movie.markAsNotNew();
    expect(movie.isNew()).toBe(false);

    movie = registry.Movie.deserialize({title: 'Inception'});
    expect(movie.isNew()).toBe(false);

    movie = registry.Movie.deserialize({_new: true, title: 'Inception'});
    expect(movie.isNew()).toBe(true);
  });

  test('Composition', () => {
    class Movie extends Model {
      @field('string') title;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const registry = new Registry('frontend', {register: {Movie, TechnicalSpecs}});

    const movie = new registry.Movie({technicalSpecs: {aspectRatio: '2.39:1'}});
    expect(movie.technicalSpecs instanceof registry.TechnicalSpecs).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');

    const technicalSpecs = new registry.TechnicalSpecs({aspectRatio: '2.35:1'});
    expect(technicalSpecs instanceof registry.TechnicalSpecs).toBe(true);
    expect(technicalSpecs.aspectRatio).toBe('2.35:1');
    movie.technicalSpecs = technicalSpecs;
    expect(movie.technicalSpecs).toBe(technicalSpecs);
  });

  test('Serialization', () => {
    class Movie extends Model {
      @field('string?') title;

      @field('string?') country;

      @field('Date?') releasedOn;

      @field('string[]') genres;

      @field('TechnicalSpecs?') technicalSpecs;

      @field('Actor[]') actors;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    class Actor extends Model {
      @field('string') fullName;
    }

    const registry = new Registry('frontend', {register: {Movie, TechnicalSpecs, Actor}});

    // Simple serialization

    let movie = new registry.Movie();
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: null,
      country: null,
      releasedOn: null,
      genres: [],
      technicalSpecs: null,
      actors: []
    });

    movie.title = 'Inception';
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: null,
      releasedOn: null,
      genres: [],
      technicalSpecs: null,
      actors: []
    });

    movie.country = 'USA';
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: null,
      genres: [],
      technicalSpecs: null,
      actors: []
    });

    movie.releasedOn = new Date(Date.UTC(2010, 6, 16));
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: [],
      technicalSpecs: null,
      actors: []
    });

    movie.genres = ['action', 'adventure', 'sci-fi'];
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: null,
      actors: []
    });

    movie.technicalSpecs = new registry.TechnicalSpecs({aspectRatio: '2.39:1'});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', _new: true, aspectRatio: '2.39:1'},
      actors: []
    });

    movie.actors = [
      new registry.Actor({fullName: 'Leonardo DiCaprio'}),
      new registry.Actor({fullName: 'Joseph Gordon-Levitt'})
    ];
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', _new: true, aspectRatio: '2.39:1'},
      actors: [
        {_type: 'Actor', _new: true, fullName: 'Leonardo DiCaprio'},
        {_type: 'Actor', _new: true, fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    // Deserialization

    movie = registry.Movie.deserialize();
    expect(movie.serialize()).toEqual({
      _type: 'Movie'
    });

    movie = registry.Movie.deserialize({_new: true});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: null,
      country: null,
      releasedOn: null,
      genres: [],
      technicalSpecs: null,
      actors: []
    });

    movie = registry.Movie.deserialize({title: 'Inception'});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception'
    });

    movie = registry.Movie.deserialize({_new: true, title: 'Inception'});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: null,
      releasedOn: null,
      genres: [],
      technicalSpecs: null,
      actors: []
    });

    movie = registry.Movie.deserialize({
      _type: 'Movie',
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'},
      actors: [
        {_type: 'Actor', fullName: 'Leonardo DiCaprio'},
        {_type: 'Actor', fullName: 'Joseph Gordon-Levitt'}
      ]
    });
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'},
      actors: [
        {_type: 'Actor', fullName: 'Leonardo DiCaprio'},
        {_type: 'Actor', fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    // Serialization using a fieldFilter

    movie = registry.Movie.deserialize({
      title: 'Inception',
      country: 'USA'
    });
    expect(
      movie.serialize({
        fieldFilter(field) {
          return field.name === 'title';
        }
      })
    ).toEqual({
      _type: 'Movie',
      title: 'Inception'
    });

    // Serialization of 'undefined'

    movie = registry.Movie.deserialize({title: 'Inception'});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception'
    });

    movie.country = undefined;
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: null
    });

    expect(
      registry.Movie.deserialize({
        _type: 'Movie',
        title: 'Inception',
        country: null
      }).serialize()
    ).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: null
    });

    // Serialization using 'source' and 'target'

    movie = registry.Movie.deserialize({title: 'Inception'}, {source: 'backend'});
    expect(movie.getFieldSource('title')).toBe('backend');
    expect(movie.serialize({target: 'backend'})).toEqual({_type: 'Movie'});
    expect(movie.serialize({target: 'frontend'})).toEqual({_type: 'Movie', title: 'Inception'});
    expect(movie.serialize({target: 'other'})).toEqual({_type: 'Movie', title: 'Inception'});
    expect(movie.serialize()).toEqual({_type: 'Movie', title: 'Inception'});

    movie.country = 'USA';
    expect(movie.getFieldSource('country')).toBe('frontend');
    expect(movie.serialize({target: 'backend'})).toEqual({_type: 'Movie', country: 'USA'});
    expect(movie.serialize({target: 'frontend'})).toEqual({_type: 'Movie', title: 'Inception'});
    expect(movie.serialize({target: 'other'})).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: 'USA'
    });
    expect(movie.serialize()).toEqual({_type: 'Movie', title: 'Inception', country: 'USA'});
  });

  test('Cloning', () => {
    class Movie extends Model {
      @field('string') title;

      @field('Date') releasedOn;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const registry = new Registry('frontend', {register: {Movie, TechnicalSpecs}});

    const movie = new registry.Movie({
      title: 'Inception',
      releasedOn: new Date(Date.UTC(2010, 6, 16)),
      technicalSpecs: {aspectRatio: '2.39:1'}
    });

    const clone = movie.clone();

    expect(clone instanceof registry.Movie).toBe(true);
    expect(clone).not.toBe(movie);
    expect(clone.serialize()).toEqual(movie.serialize());

    expect(clone.title).toBe('Inception');

    expect(clone.releasedOn instanceof Date).toBe(true);
    expect(clone.releasedOn).not.toBe(movie.releasedOn);
    expect(clone.releasedOn.toISOString()).toBe('2010-07-16T00:00:00.000Z');

    expect(clone.technicalSpecs instanceof registry.TechnicalSpecs).toBe(true);
    expect(clone.technicalSpecs).not.toBe(movie.technicalSpecs);
    expect(clone.technicalSpecs.aspectRatio).toBe('2.39:1');
  });

  test('Polymorphism', () => {
    class Movie extends Model {
      @field('string') title;

      @field('Identity') owner;
    }

    class Identity extends Model {}

    class User extends Identity {
      @field('string') email;
    }

    class Organization extends Identity {
      @field('string') name;
    }

    class Actor extends Model {
      @field('string') fullName;
    }

    const registry = new Registry('frontend', {
      register: {Movie, Identity, User, Organization, Actor}
    });

    const movie = new registry.Movie({title: 'Inception'});
    expect(movie.title).toBe('Inception');

    movie.owner = new registry.User({email: 'hi@domain.com'});
    expect(movie.owner instanceof registry.User).toBe(true);
    expect(movie.owner.email).toBe('hi@domain.com');

    movie.owner = new registry.Organization({name: 'Nice Inc.'});
    expect(movie.owner instanceof registry.Organization).toBe(true);
    expect(movie.owner.name).toBe('Nice Inc.');

    expect(() => {
      movie.owner = new registry.Actor({fullName: 'Leonardo DiCaprio'}); // Actor is not an Identity
    }).toThrow(/Type mismatch/);
  });
});
