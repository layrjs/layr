import {Registry} from '@superstore/registry';

import {Model, field} from '../../..';

describe('@superstore/model', () => {
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

    const movie1 = new Movie();
    expect(movie1.title).toBeUndefined();
    expect(movie1.isRestricted).toBe(false);

    const movie2 = new Movie({title: 'Inception', isRestricted: true});
    expect(movie2.title).toBe('Inception');
    expect(movie2.isRestricted).toBe(true);

    const movie3 = Movie.deserialize({title: 'Inception'});
    expect(movie3.title).toBe('Inception');
    expect(movie3.isRestricted).toBeUndefined(); // Default values are not set on deserialization
  });

  test('Date field', () => {
    class Movie extends Model {
      @field('string') title;

      @field('Date') releasedOn;
    }

    const movie1 = new Movie({title: 'Inception', releasedOn: new Date(Date.UTC(2010, 6, 16))});
    expect(movie1.title).toBe('Inception');
    expect(movie1.releasedOn.getUTCFullYear()).toBe(2010);
    expect(movie1.releasedOn.getUTCMonth()).toBe(6);
    expect(movie1.releasedOn.getUTCDate()).toBe(16);

    const movie2 = new Movie({
      title: {_type: 'string', _value: 'The Matrix'},
      releasedOn: {_type: 'Date', _value: '1999-03-31T00:00:00.000Z'}
    });
    expect(movie2.title).toBe('The Matrix');
    expect(movie2.releasedOn.getUTCFullYear()).toBe(1999);
    expect(movie2.releasedOn.getUTCMonth()).toBe(2);
    expect(movie2.releasedOn.getUTCDate()).toBe(31);
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

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const registry = new Registry({Movie, TechnicalSpecs});

    // Simple serialization

    let movie = new registry.Movie();
    expect(movie.serialize()).toEqual({_type: 'Movie'});

    movie.id = 'abc123';
    expect(movie.serialize()).toEqual({_type: 'Movie', _id: 'abc123'});

    movie.title = 'Inception';
    expect(movie.serialize()).toEqual({_type: 'Movie', _id: 'abc123', title: 'Inception'});

    movie.releasedOn = new Date(Date.UTC(2010, 6, 16));
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'}
    });

    movie.technicalSpecs = new registry.TechnicalSpecs({aspectRatio: '2.39:1'});
    expect(movie.serialize()).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'}
    });

    expect(
      registry.Movie.deserialize({
        _type: 'Movie',
        _id: 'abc123',
        title: 'Inception',
        releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
        technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'}
      }).serialize()
    ).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'Inception',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1'}
    });

    // Serialization options

    movie = registry.Movie.deserialize({
      _id: 'abc123',
      title: 'Inception',
      releasedOn: new Date(Date.UTC(2010, 6, 16))
    });

    expect(movie.serialize({includeFields: false, includeChangedFields: true})).toEqual({
      _type: 'Movie'
    });

    movie.title = 'The Matrix';
    expect(movie.serialize({includeFields: false, includeChangedFields: true})).toEqual({
      _type: 'Movie',
      title: 'The Matrix'
    });

    movie.releasedOn = undefined;
    expect(movie.serialize({includeFields: false, includeChangedFields: true})).toEqual({
      _type: 'Movie',
      title: 'The Matrix'
    });
    expect(
      movie.serialize({
        includeFields: false,
        includeChangedFields: true,
        includeUndefinedFields: true
      })
    ).toEqual({
      _type: 'Movie',
      title: 'The Matrix',
      releasedOn: {_type: 'undefined'}
    });
    expect(
      movie.serialize({
        includeFields: ['id'],
        includeChangedFields: true,
        includeUndefinedFields: true
      })
    ).toEqual({
      _type: 'Movie',
      _id: 'abc123',
      title: 'The Matrix',
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
