import {Registry} from '@storable/registry';

import {Model, field, validators, createValidator} from '../../..';

const {notEmpty, maxLength, greaterThanOrEqual} = validators;

describe('@storable/model', () => {
  test('Simple model', () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;
    }

    const movie = new Movie({title: 'Inception', year: 2010});
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);

    movie.title = 'The Matrix';
    expect(movie.title).toBe('The Matrix');
    movie.year = 1999;
    expect(movie.year).toBe(1999);

    expect(() => {
      movie.year = '1999'; // Type mismatch
    }).toThrow();

    const anotherMovie = new Movie({title: 'Forrest Gump', unknownField: 'abc'});
    expect(anotherMovie.title).toBe('Forrest Gump');
    expect(anotherMovie.unknownField).toBeUndefined(); // Silently ignore undefined fields
  });

  test('Default values', () => {
    class Movie extends Model {
      @field('string') title;

      @field('boolean') isRestricted = false;
    }

    let movie = new Movie();
    expect(movie.title).toBeUndefined();
    expect(movie.isRestricted).toBe(false);

    movie = new Movie({title: 'Inception', isRestricted: true});
    expect(movie.title).toBe('Inception');
    expect(movie.isRestricted).toBe(true);

    movie = Movie.deserialize({title: 'Inception'});
    expect(movie.title).toBe('Inception');
    expect(movie.isRestricted).toBeUndefined(); // Default values are not set on deserialization
  });

  test('Date field', () => {
    class Movie extends Model {
      @field('string') title;

      @field('Date') releasedOn;
    }

    let movie = new Movie({title: 'Inception', releasedOn: new Date(Date.UTC(2010, 6, 16))});
    expect(movie.title).toBe('Inception');
    expect(movie.releasedOn.getUTCFullYear()).toBe(2010);
    expect(movie.releasedOn.getUTCMonth()).toBe(6);
    expect(movie.releasedOn.getUTCDate()).toBe(16);

    movie = new Movie({
      title: {_type: 'string', _value: 'The Matrix'},
      releasedOn: {_type: 'Date', _value: '1999-03-31T00:00:00.000Z'}
    });
    expect(movie.title).toBe('The Matrix');
    expect(movie.releasedOn.getUTCFullYear()).toBe(1999);
    expect(movie.releasedOn.getUTCMonth()).toBe(2);
    expect(movie.releasedOn.getUTCDate()).toBe(31);
  });

  test('Array field', () => {
    class Movie extends Model {
      @field('string') title;

      @field('string[]') genres;

      @field('Person[]') actors;
    }

    class Person extends Model {
      @field('string') fullName;
    }

    const registry = new Registry({Movie, Person});

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
    expect(movie.actors[0].fullName).toBe('Leonardo DiCaprio');
    expect(movie.actors[1].fullName).toBe('Joseph Gordon-Levitt');

    movie = new registry.Movie({
      title: {_type: 'string', _value: 'The Matrix'},
      genres: [{_type: 'string', _value: 'action'}, {_type: 'string', _value: 'sci-fi'}],
      actors: [{_type: 'Person', fullName: 'Leonardo DiCaprio'}]
    });
    expect(movie.title).toBe('The Matrix');
    expect(movie.genres).toEqual(['action', 'sci-fi']);
    expect(movie.actors.length).toBe(1);
    expect(movie.actors[0].fullName).toBe('Leonardo DiCaprio');
  });

  test('Inheritance', () => {
    class Item extends Model {
      @field('string') id;
    }

    class Movie extends Item {
      @field('string') title;
    }

    const movie = new Movie({id: 'abc123', title: 'Inception'});
    expect(movie.id).toBe('abc123');
    expect(movie.title).toBe('Inception');

    expect(() => {
      return class Actor extends Item {
        @field('string') id; // Cannot add a property that already exists
      };
    }).toThrow();
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

    let movie = new Movie();
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

    movie = new Movie({
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
    }).toThrow();

    movie = new Movie({title: 'Inception'});
    expect(movie.isValid()).toBe(true);
    expect(movie.validate()).toBe(true);
  });

  test('Commit and rollback', () => {
    class Movie extends Model {
      @field('string') title;
    }

    let movie = new Movie({title: 'Inception'});
    expect(movie.isChanged()).toBe(true); // Models created with `new' are considered as changed

    movie = Movie.deserialize({title: 'Inception'});
    expect(movie.isChanged()).toBe(false); // Deserialized models are considered as unchanged

    movie.title = 'The Matrix';
    expect(movie.isChanged()).toBe(true);

    movie.commit();
    expect(movie.isChanged()).toBe(false);

    movie.title = 'Inception';
    expect(movie.isChanged()).toBe(true);

    movie.rollback();
    expect(movie.title).toBe('The Matrix');
    expect(movie.isChanged()).toBe(false);
  });

  test('Composition', () => {
    class Movie extends Model {
      @field('string') title;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const registry = new Registry({Movie, TechnicalSpecs});

    const technicalSpecs = new registry.TechnicalSpecs({aspectRatio: '2.39:1'});
    const movie = new registry.Movie({technicalSpecs});
    expect(movie.technicalSpecs).toBe(technicalSpecs);

    movie.technicalSpecs = {aspectRatio: '2.35:1'};
    expect(movie.technicalSpecs.aspectRatio).toBe('2.35:1');
    expect(movie.technicalSpecs instanceof registry.TechnicalSpecs).toBe(true);
  });

  test('Serialization', () => {
    class Movie extends Model {
      @field('string', {serializedName: '_id'}) id;

      @field('string') title;

      @field('Date') releasedOn;

      @field('string[]') genres;

      @field('TechnicalSpecs') technicalSpecs;

      @field('Person[]') actors;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    class Person extends Model {
      @field('string') fullName;
    }

    const registry = new Registry({Movie, TechnicalSpecs, Person});

    // Simple serialization

    let movie = registry.Movie.deserialize();
    expect(movie.serialize()).toEqual({_type: 'Movie'});

    movie = new registry.Movie();
    expect(movie.serialize()).toEqual({_type: 'Movie', genres: [], actors: []});

    movie.id = 'abc123';
    expect(movie.serialize()).toEqual({_type: 'Movie', _id: 'abc123', genres: [], actors: []});

    movie.title = 'Inception';
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      genres: [],
      actors: []
    });

    movie.releasedOn = new Date(Date.UTC(2010, 6, 16));
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: [],
      actors: []
    });

    movie.genres = ['action', 'adventure', 'sci-fi'];
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      actors: []
    });

    movie.technicalSpecs = {aspectRatio: '2.39:1'};
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'},
      actors: []
    });

    movie.actors = [{fullName: 'Leonardo DiCaprio'}, {fullName: 'Joseph Gordon-Levitt'}];
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'},
      actors: [
        {_type: 'Person', fullName: 'Leonardo DiCaprio'},
        {_type: 'Person', fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    expect(
      registry.Movie.deserialize({
        _type: 'Movie',
        _id: 'abc123',
        title: 'Inception',
        releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
        genres: ['action', 'adventure', 'sci-fi'],
        technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'},
        actors: [
          {_type: 'Person', fullName: 'Leonardo DiCaprio'},
          {_type: 'Person', fullName: 'Joseph Gordon-Levitt'}
        ]
      }).serialize()
    ).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'},
      actors: [
        {_type: 'Person', fullName: 'Leonardo DiCaprio'},
        {_type: 'Person', fullName: 'Joseph Gordon-Levitt'}
      ]
    });

    // Serialization filter

    movie = registry.Movie.deserialize({
      _id: 'abc123',
      title: 'Inception',
      releasedOn: new Date(Date.UTC(2010, 6, 16))
    });

    expect(movie.serialize({filter: (model, field) => model.fieldIsChanged(field)})).toEqual({
      _type: 'Movie'
    });

    movie.title = 'The Matrix';
    expect(movie.serialize({filter: (model, field) => model.fieldIsChanged(field)})).toEqual({
      _type: 'Movie',
      title: 'The Matrix'
    });

    expect(
      movie.serialize({
        filter: (model, field) => field.name === 'id' || model.fieldIsChanged(field)
      })
    ).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'The Matrix'
    });

    // Serialization of 'undefined'

    movie = new registry.Movie({id: 'abc123', title: 'Inception'});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      genres: [],
      actors: []
    });

    movie.releasedOn = undefined;
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'undefined'},
      genres: [],
      actors: []
    });

    expect(
      registry.Movie.deserialize({
        _type: 'Movie',
        _id: 'abc123',
        title: 'Inception',
        releasedOn: {_type: 'undefined'}
      }).serialize()
    ).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'undefined'}
    });
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

    const registry = new Registry({Movie, TechnicalSpecs});

    const movie = new registry.Movie({
      title: 'Inception',
      releasedOn: new Date(Date.UTC(2010, 6, 16)),
      technicalSpecs: new registry.TechnicalSpecs({aspectRatio: '2.39:1'})
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

    const registry = new Registry({Movie, Identity, User, Organization, Actor});

    const movie = new registry.Movie({title: 'Inception'});
    expect(movie.title).toBe('Inception');

    movie.owner = new registry.User({email: 'hi@domain.com'});
    expect(movie.owner.email).toBe('hi@domain.com');
    expect(movie.owner instanceof registry.User).toBe(true);

    movie.owner = {_type: 'User', email: 'bonjour@domaine.fr'};
    expect(movie.owner.email).toBe('bonjour@domaine.fr');
    expect(movie.owner instanceof registry.User).toBe(true);

    movie.owner = new registry.Organization({name: 'Nice Inc.'});
    expect(movie.owner.name).toBe('Nice Inc.');
    expect(movie.owner instanceof registry.Organization).toBe(true);

    expect(() => {
      movie.owner = new registry.Actor({fullName: 'Leonardo DiCaprio'}); // Actor is not an Identity
    }).toThrow();
  });
});
