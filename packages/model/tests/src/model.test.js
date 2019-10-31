import {Layer} from '@liaison/layer';

import {Model, field, validators, createValidator} from '../../..';

const {notEmpty, maxLength, greaterThanOrEqual} = validators;

describe('Model', () => {
  test('Basic fields', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;
    }

    const layer = new Layer({Movie});
    await layer.$open();

    let movie = new layer.Movie({title: 'Inception', year: 2010});
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);

    movie.title = 'The Matrix';
    expect(movie.title).toBe('The Matrix');
    movie.year = 1999;
    expect(movie.year).toBe(1999);

    movie = new layer.Movie({title: 'Forrest Gump', unknownField: 'abc'});
    expect(movie.title).toBe('Forrest Gump');
    expect(movie.unknownField).toBeUndefined(); // Silently ignore undefined fields
  });

  test('Date field', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('Date') releasedOn;
    }

    const layer = new Layer({Movie});
    await layer.$open();

    const movie = new layer.Movie({
      title: 'Inception',
      releasedOn: new Date(Date.UTC(2010, 6, 16))
    });
    expect(movie.title).toBe('Inception');
    expect(movie.releasedOn.getUTCFullYear()).toBe(2010);
    expect(movie.releasedOn.getUTCMonth()).toBe(6);
    expect(movie.releasedOn.getUTCDate()).toBe(16);
  });

  test('Array field', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('string[]') genres;

      @field('Actor[]') actors;
    }

    class Actor extends Model {
      @field('string') fullName;
    }

    const layer = new Layer({Movie, Actor});
    await layer.$open();

    let movie = new layer.Movie();
    expect(movie.$fieldIsActive('genres')).toBe(false);
    expect(movie.$fieldIsActive('actors')).toBe(false);

    movie = new layer.Movie({
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      actors: [{fullName: 'Leonardo DiCaprio'}, {fullName: 'Joseph Gordon-Levitt'}]
    });
    expect(movie.title).toBe('Inception');
    expect(movie.genres).toEqual(['action', 'adventure', 'sci-fi']);
    expect(movie.actors.length).toBe(2);
    expect(movie.actors[0] instanceof layer.Actor).toBe(true);
    expect(movie.actors[0].fullName).toBe('Leonardo DiCaprio');
    expect(movie.actors[1] instanceof layer.Actor).toBe(true);
    expect(movie.actors[1].fullName).toBe('Joseph Gordon-Levitt');
  });

  test('Type checking', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;

      @field('string[]') genres;
    }

    const layer = new Layer({Movie});
    await layer.$open();

    const movie = new layer.Movie();

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

  test('Default values', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('boolean') isRestricted = false;
    }

    const layer = new Layer({Movie});
    await layer.$open();

    let movie = new layer.Movie();
    expect(movie.$fieldIsActive('title')).toBe(false);
    expect(movie.isRestricted).toBe(false);

    movie = new layer.Movie({title: 'Inception', isRestricted: true});
    expect(movie.title).toBe('Inception');
    expect(movie.isRestricted).toBe(true);
  });

  test('Getters and setters', async () => {
    class Session extends Model {
      @field('string', {
        getter() {
          return this._token;
        },
        setter(value) {
          this._token = value;
        }
      })
      token;
    }

    const layer = new Layer({Session});
    await layer.$open();

    const session = new layer.Session({token: 'abc123'});
    expect(session.token).toBe('abc123');
    expect(session._token).toBe('abc123');

    session.token = 'xyz789';
    expect(session.token).toBe('xyz789');
    expect(session._token).toBe('xyz789');
  });

  test('Inheritance', async () => {
    class Item extends Model {
      @field('string') id;
    }

    class Movie extends Item {
      @field({validators: [notEmpty()]}) id;

      @field('string') title;
    }

    expect(
      Item.prototype
        .$getField('id')
        .$getScalar()
        .$hasValidators()
    ).toBe(false);
    expect(
      Movie.prototype
        .$getField('id')
        .$getScalar()
        .$hasValidators()
    ).toBe(true);

    const layer = new Layer({Movie});
    await layer.$open();

    const movie = new layer.Movie({id: 'abc123', title: 'Inception'});
    expect(movie.id).toBe('abc123');
    expect(movie.title).toBe('Inception');
  });

  test('Composition', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const layer = new Layer({Movie, TechnicalSpecs});
    await layer.$open();

    const movie = new layer.Movie({technicalSpecs: {aspectRatio: '2.39:1'}});
    expect(movie.technicalSpecs instanceof layer.TechnicalSpecs).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');

    const technicalSpecs = new layer.TechnicalSpecs({aspectRatio: '2.35:1'});
    expect(technicalSpecs instanceof layer.TechnicalSpecs).toBe(true);
    expect(technicalSpecs.aspectRatio).toBe('2.35:1');
    movie.technicalSpecs = technicalSpecs;
    expect(movie.technicalSpecs).toBe(technicalSpecs);
  });

  test('Validation', async () => {
    class Movie extends Model {
      @field('string', {validators: [notEmpty(), maxLength(40)]}) title;

      @field('number?', {validators: [greaterThanOrEqual(1900)]}) year;

      @field('string[]?', {validators: [maxLength(3), [notEmpty()]]}) genres;

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

    const layer = new Layer({Movie});
    await layer.$open();

    let movie = new layer.Movie();
    expect(movie.$getFailedValidators()).toBeUndefined();
    movie.title = undefined;
    expect(movie.$getFailedValidators()).toEqual({title: ['required()']});
    movie.title = '';
    expect(movie.$getFailedValidators()).toEqual({title: ['notEmpty()']});
    movie.title = '12345678901234567890123456789012345678901';
    expect(movie.$getFailedValidators()).toEqual({title: ['maxLength(40)']});
    movie.title = '1234567890123456789012345678901234567890';
    expect(movie.$getFailedValidators()).toBeUndefined();

    movie.year = 1899;
    expect(movie.$getFailedValidators()).toEqual({year: ['greaterThanOrEqual(1900)']});
    movie.year = 1900;
    expect(movie.$getFailedValidators()).toBeUndefined();

    movie.genres = ['action', 'adventure', 'sci-fi', 'drama'];
    expect(movie.$getFailedValidators()).toEqual({genres: ['maxLength(3)']});
    movie.genres = ['action', '', 'sci-fi'];
    expect(movie.$getFailedValidators()).toEqual({
      genres: [[undefined, ['notEmpty()'], undefined]]
    });
    movie.genres = ['action', 'adventure', 'sci-fi'];
    expect(movie.$getFailedValidators()).toBeUndefined();

    movie.director = 'christopher nolan';
    expect(movie.$getFailedValidators()).toEqual({director: ['startsWithUpperCase()']});
    movie.director = 'Christopher Nolan';
    expect(movie.$getFailedValidators()).toBeUndefined();

    movie = new layer.Movie({
      title: '',
      year: 1899,
      genres: ['action', 'adventure', '', 'drama'],
      director: 'christopher nolan'
    });
    expect(movie.$getFailedValidators()).toEqual({
      title: ['notEmpty()'],
      year: ['greaterThanOrEqual(1900)'],
      genres: ['maxLength(3)', [undefined, undefined, ['notEmpty()'], undefined]],
      director: ['startsWithUpperCase()']
    });

    expect(movie.$isValid()).toBe(false);
    expect(() => {
      movie.$validate();
    }).toThrow(/Model validation failed/);

    movie = new layer.Movie({title: 'Inception'});
    expect(movie.$isValid()).toBe(true);
    expect(() => movie.$validate()).not.toThrow();
  });

  test('$isNew()', async () => {
    class Movie extends Model {
      @field('string') title;
    }

    const layer = new Layer({Movie});
    await layer.$open();

    let movie = new layer.Movie({title: 'Inception'});
    expect(movie.$isNew()).toBe(true);

    movie.$markAsNotNew();
    expect(movie.$isNew()).toBe(false);

    movie = layer.Movie.$deserialize({title: 'Inception'});
    expect(movie.$isNew()).toBe(false);

    movie = layer.Movie.$deserialize({_new: true, title: 'Inception'});
    expect(movie.$isNew()).toBe(true);
  });

  test('$assign()', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('number') year;

      @field('string[]') genres;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const layer = new Layer({Movie, TechnicalSpecs});
    await layer.$open();

    const movie = new layer.Movie();

    movie.$assign({title: 'Inception', year: 2010});
    expect(movie.title).toBe('Inception');
    expect(movie.year).toBe(2010);

    movie.$assign({genres: ['action', 'drama']});
    expect(movie.genres).toEqual(['action', 'drama']);

    movie.$assign({technicalSpecs: {aspectRatio: '2.39:1'}});
    expect(movie.technicalSpecs instanceof layer.TechnicalSpecs).toBe(true);
    expect(movie.technicalSpecs.aspectRatio).toBe('2.39:1');

    const movie2 = new layer.Movie();
    movie2.$assign(movie);
    expect(movie2.title).toBe('Inception');
    expect(movie2.year).toBe(2010);
    expect(movie2.genres).toEqual(['action', 'drama']);
    expect(movie2.technicalSpecs).not.toBe(movie.technicalSpecs);
    expect(movie2.technicalSpecs.aspectRatio).toBe('2.39:1');
  });

  test('Serialization', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('string') country;

      @field('Date') releasedOn;

      @field('string[]') genres;

      @field('TechnicalSpecs') technicalSpecs;

      @field('Actor[]') actors;

      @field('boolean') isAvailable = true;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    class Actor extends Model {
      @field('string') fullName;
    }

    const layer = new Layer({Movie, TechnicalSpecs, Actor});
    await layer.$open();

    // Simple serialization

    let movie = new layer.Movie();
    expect(movie.$serialize()).toEqual({_type: 'Movie', _new: true, isAvailable: true});

    movie.title = 'Inception';
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      isAvailable: true
    });

    movie.country = 'USA';
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      isAvailable: true
    });

    movie.releasedOn = new Date(Date.UTC(2010, 6, 16));
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      isAvailable: true
    });

    movie.genres = ['action', 'adventure', 'sci-fi'];
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      isAvailable: true
    });

    movie.technicalSpecs = new layer.TechnicalSpecs({aspectRatio: '2.39:1'});
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      country: 'USA',
      releasedOn: {_type: 'Date', _value: '2010-07-16T00:00:00.000Z'},
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', _new: true, aspectRatio: '2.39:1'},
      isAvailable: true
    });

    movie.actors = [
      new layer.Actor({fullName: 'Leonardo DiCaprio'}),
      new layer.Actor({fullName: 'Joseph Gordon-Levitt'})
    ];
    expect(movie.$serialize()).toEqual({
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
      ],
      isAvailable: true
    });

    movie.isAvailable = false;
    expect(movie.$serialize()).toEqual({
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
      ],
      isAvailable: false
    });

    // Serialization of 'undefined'

    movie = layer.Movie.$deserialize({title: 'Inception'});
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception'
    });

    movie.country = undefined;
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: null
    });

    expect(
      layer.Movie.$deserialize({
        _type: 'Movie',
        title: 'Inception',
        country: null
      }).$serialize()
    ).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: null
    });

    // Serialization using 'source' and 'target'

    const backendName = 'abc123';
    const otherName = 'xyz789';

    movie = layer.Movie.$deserialize({title: 'Inception'}, {source: backendName});
    expect(movie.$getField('title').$getSource()).toBe(backendName);
    expect(movie.$serialize({target: backendName})).toEqual({_type: 'Movie'});
    expect(movie.$serialize({target: otherName})).toEqual({_type: 'Movie', title: 'Inception'});
    expect(movie.$serialize({target: undefined})).toEqual({
      _type: 'Movie',
      title: 'Inception',
      _src: {title: backendName}
    });

    movie.country = 'USA';
    expect(movie.$getField('country').$getSource()).toBeUndefined();
    expect(movie.$serialize({target: backendName})).toEqual({_type: 'Movie', country: 'USA'});
    expect(movie.$serialize({target: otherName})).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: 'USA'
    });
    expect(movie.$serialize({target: undefined})).toEqual({
      _type: 'Movie',
      title: 'Inception',
      country: 'USA',
      _src: {title: backendName}
    });

    movie = layer.Movie.$deserialize(movie.$serialize());
    expect(movie.$getField('title').$getSource()).toBe(backendName);
    expect(movie.$getField('country').$getSource()).toBeUndefined();
  });

  test('Deserialization', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('string') country;

      @field('Date') releasedOn;

      @field('string[]') genres;

      @field('TechnicalSpecs') technicalSpecs;

      @field('Actor[]') actors;

      @field('boolean') isAvailable = true;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;

      @field('boolean') isColored;
    }

    class Actor extends Model {
      @field('string') fullName;

      @field('string') country;
    }

    const layer = new Layer({Movie, TechnicalSpecs, Actor});
    await layer.$open();

    // Simple deserialization

    let movie = layer.Movie.$deserialize();
    expect(movie.$serialize()).toEqual({
      _type: 'Movie'
    });

    movie = layer.Movie.$deserialize({_new: true});
    expect(movie.$serialize()).toEqual({_type: 'Movie', _new: true, isAvailable: true});

    movie = layer.Movie.$deserialize({title: 'Inception'});
    expect(movie.$serialize()).toEqual({_type: 'Movie', title: 'Inception'});

    movie = layer.Movie.$deserialize({_new: true, title: 'Inception', isAvailable: false});
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      isAvailable: false
    });

    movie = layer.$deserialize({
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
    expect(movie.$serialize()).toEqual({
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

    // Deserialization using the 'fields' option

    movie = layer.$deserialize(
      {_type: 'Movie', title: 'Inception', country: 'USA'},
      {fields: {title: true}}
    );
    expect(movie.$serialize()).toEqual({_type: 'Movie', title: 'Inception'});

    movie = layer.$deserialize(
      {
        _type: 'Movie',
        title: 'Inception',
        country: 'USA',
        genres: ['action', 'adventure', 'sci-fi'],
        technicalSpecs: {_type: 'TechnicalSpecs', aspectRatio: '2.39:1', isColored: true},
        actors: [
          {_type: 'Actor', fullName: 'Leonardo DiCaprio', country: 'USA'},
          {_type: 'Actor', fullName: 'Joseph Gordon-Levitt', country: 'USA'}
        ]
      },
      {
        fields: {
          title: true,
          genres: true,
          technicalSpecs: {isColored: true},
          actors: [{country: true}]
        }
      }
    );
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception',
      genres: ['action', 'adventure', 'sci-fi'],
      technicalSpecs: {_type: 'TechnicalSpecs', isColored: true},
      actors: [{_type: 'Actor', country: 'USA'}, {_type: 'Actor', country: 'USA'}]
    });

    // Deserialization with a synchronous filter

    movie = layer.$deserialize(
      {_type: 'Movie', title: 'Inception', country: 'USA'},
      {
        filter(field) {
          return field.$getName() === 'title';
        }
      }
    );
    expect(movie.then).toBeUndefined(); // movie is not a promise
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception'
    });

    // Deserialization with an asynchronous filter

    const moviePromise = layer.$deserialize(
      {_type: 'Movie', title: 'Inception', country: 'USA'},
      {
        async filter(field) {
          return field.$getName() === 'title';
        }
      }
    );
    expect(typeof moviePromise.then).toBe('function'); // moviePromise is a promise
    movie = await moviePromise;
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      title: 'Inception'
    });
  });

  test('Polymorphism', async () => {
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

    const layer = new Layer({Movie, Identity, User, Organization, Actor});
    await layer.$open();

    const movie = new layer.Movie({title: 'Inception'});
    expect(movie.title).toBe('Inception');

    movie.owner = new layer.User({email: 'hi@domain.com'});
    expect(movie.owner instanceof layer.User).toBe(true);
    expect(movie.owner.email).toBe('hi@domain.com');

    movie.owner = new layer.Organization({name: 'Nice Inc.'});
    expect(movie.owner instanceof layer.Organization).toBe(true);
    expect(movie.owner.name).toBe('Nice Inc.');

    expect(() => {
      movie.owner = new layer.Actor({fullName: 'Leonardo DiCaprio'}); // Actor is not an Identity
    }).toThrow(/Type mismatch/);
  });

  test('Circular type', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('Movie[]') similarMovies = [];
    }

    const layer = new Layer({Movie});
    await layer.$open();

    let movie = new layer.Movie({
      title: 'Inception',
      similarMovies: [new layer.Movie({title: 'The Matrix'})]
    });
    expect(movie.$serialize()).toEqual({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      similarMovies: [{_type: 'Movie', _new: true, title: 'The Matrix'}]
    });

    movie = layer.$deserialize({
      _type: 'Movie',
      _new: true,
      title: 'Inception',
      similarMovies: [{_type: 'Movie', _new: true, title: 'The Matrix'}]
    });
    expect(movie instanceof layer.Movie).toBe(true);
    expect(movie.title).toBe('Inception');
    expect(movie.similarMovies).toHaveLength(1);
    expect(movie.similarMovies[0] instanceof layer.Movie).toBe(true);
    expect(movie.similarMovies[0].title).toBe('The Matrix');
  });

  test('Observability', async () => {
    class Movie extends Model {
      @field('string') title;

      @field('string[]') genres;

      @field('TechnicalSpecs') technicalSpecs;
    }

    class TechnicalSpecs extends Model {
      @field('string') aspectRatio;
    }

    const layer = new Layer({Movie, TechnicalSpecs});
    await layer.$open();

    const movie = new layer.Movie({
      title: 'Inception',
      genres: ['Drama'],
      technicalSpecs: {aspectRatio: '2.39:1'}
    });

    const observer = jest.fn();
    movie.$observe(observer);

    expect(observer.mock.calls.length).toBe(0);
    let numberOfCalls = observer.mock.calls.length;

    movie.title = 'The Matrix';
    expect(observer.mock.calls.length).not.toBe(numberOfCalls);
    numberOfCalls = observer.mock.calls.length;

    movie.genres.push('Action');
    expect(observer.mock.calls.length).not.toBe(numberOfCalls);
    numberOfCalls = observer.mock.calls.length;

    movie.technicalSpecs.aspectRatio = '2.4:1';
    expect(observer.mock.calls.length).not.toBe(numberOfCalls);
    numberOfCalls = observer.mock.calls.length;

    movie.technicalSpecs.aspectRatio = '2.4:1'; // No changes
    expect(observer.mock.calls.length).toBe(numberOfCalls);

    movie.technicalSpecs.$notify();
    expect(observer.mock.calls.length).not.toBe(numberOfCalls);
  });
});
