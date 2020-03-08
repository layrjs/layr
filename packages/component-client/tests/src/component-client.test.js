import {
  isComponentClass,
  isComponentInstance,
  isModelClass,
  isModelAttribute,
  isEntityClass,
  isPrimaryIdentifierAttribute,
  isSecondaryIdentifierAttribute
} from '@liaison/entity';
import isEqual from 'lodash/isEqual';

import {ComponentClient} from '../../..';

describe('ComponentClient', () => {
  const server = {
    receiveQuery(query, {version: clientVersion} = {}) {
      const serverVersion = 1;

      if (clientVersion !== serverVersion) {
        throw Object.assign(
          new Error(
            `The component client version (${clientVersion}) doesn't match the component server version (${serverVersion})`
          ),
          {code: 'COMPONENT_CLIENT_VERSION_DOES_NOT_MATCH_COMPONENT_SERVER_VERSION'}
        );
      }

      // client.getComponents()
      if (isEqual(query, {'introspect=>': {'()': []}})) {
        return {
          components: [
            {
              name: 'Movie',
              type: 'Component',
              properties: [
                {
                  name: 'token',
                  type: 'attribute',
                  value: {__undefined: true},
                  exposure: {get: true, set: true}
                },
                {name: 'find', type: 'method', exposure: {call: true}}
              ]
            },
            {
              name: 'movie',
              type: 'component',
              properties: [
                {name: 'title', type: 'attribute', exposure: {get: true, set: true}},
                {
                  name: 'isPlaying',
                  type: 'attribute',
                  default: {__function: 'function() { return false; }'},
                  exposure: {get: true}
                },
                {name: 'play', type: 'method', exposure: {call: true}}
              ]
            },
            {
              name: 'film',
              type: 'model',
              properties: [
                {
                  name: 'title',
                  type: 'modelAttribute',
                  valueType: 'string',
                  validators: [
                    {
                      __validator: 'value => value.length > 0',
                      name: 'notEmpty',
                      message: 'The validator `notEmpty()` failed'
                    }
                  ],
                  exposure: {get: true, set: true}
                }
              ]
            },
            {
              name: 'user',
              type: 'entity',
              properties: [
                {
                  name: 'id',
                  type: 'primaryIdentifierAttribute',
                  valueType: 'string',
                  default: {__function: 'function() { return this.constructor.generateId(); }'},
                  exposure: {get: true, set: true}
                },
                {
                  name: 'email',
                  type: 'secondaryIdentifierAttribute',
                  valueType: 'string',
                  exposure: {get: true, set: true}
                }
              ]
            }
          ]
        };
      }

      // Movie.find()
      if (
        isEqual(query, {
          '<=': {__component: 'Movie', token: 'abc123'},
          'find=>result': {'()': []},
          '=>self': true
        })
      ) {
        return {
          result: [
            {__component: 'movie', title: 'Inception'},
            {__component: 'movie', title: 'The Matrix'}
          ],
          self: {__component: 'Movie', token: 'abc123'}
        };
      }

      // Movie.find({limit: 1})
      if (
        isEqual(query, {
          '<=': {__component: 'Movie', token: 'abc123'},
          'find=>result': {'()': [{limit: 1}]},
          '=>self': true
        })
      ) {
        return {
          result: [{__component: 'movie', title: 'Inception'}],
          self: {__component: 'Movie', token: 'abc123'}
        };
      }

      // movie.play()
      if (
        isEqual(query, {
          '<=': {__component: 'movie', title: 'Inception'},
          'play=>result': {'()': []},
          '=>self': true
        })
      ) {
        return {
          result: {__component: 'movie', isPlaying: true},
          self: {__component: 'movie', isPlaying: true}
        };
      }

      throw new Error(`Received an unknown query: ${JSON.stringify(query)}`);
    }
  };

  test('Getting components', async () => {
    let client = new ComponentClient(server);

    expect(() => client.getComponents()).toThrow(
      "The component client version (undefined) doesn't match the component server version (1)"
    );

    client = new ComponentClient(server, {version: 1});

    const {Movie, movie} = client.getComponents();

    expect(isComponentClass(Movie)).toBe(true);
    expect(Movie.getComponentName()).toBe('Movie');

    let attribute = Movie.getAttribute('token');

    expect(attribute.getValue()).toBeUndefined();
    expect(attribute.getExposure()).toEqual({get: true, set: true});

    expect(typeof Movie.find).toBe('function');

    expect(isComponentInstance(movie)).toBe(true);
    expect(movie.getComponentName()).toBe('movie');
    expect(movie).toBe(Movie.prototype);

    attribute = movie.getAttribute('title');

    expect(attribute.isSet()).toBe(false);
    expect(attribute.getDefaultValue()).toBeUndefined();
    expect(attribute.getExposure()).toEqual({get: true, set: true});

    attribute = movie.getAttribute('isPlaying');

    expect(attribute.isSet()).toBe(false);
    expect(attribute.getDefaultValue()).toBe(false);
    expect(attribute.getExposure()).toEqual({get: true});

    expect(typeof movie.play).toBe('function');
  });

  test('Getting models', async () => {
    let client = new ComponentClient(server);

    client = new ComponentClient(server, {version: 1});

    const {Film, film} = client.getComponents();

    expect(isModelClass(Film)).toBe(true);
    expect(Film.getComponentName()).toBe('Film');

    expect(isComponentInstance(film)).toBe(true);
    expect(film.getComponentName()).toBe('film');

    const attribute = film.getAttribute('title');

    expect(isModelAttribute(attribute)).toBe(true);
    expect(attribute.isSet()).toBe(false);
    expect(attribute.getDefaultValue()).toBeUndefined();
    expect(attribute.getExposure()).toEqual({get: true, set: true});
    expect(attribute.getType().toString()).toBe('string');
    expect(attribute.getType().getValidators()).toHaveLength(1);
    expect(
      attribute
        .getType()
        .getValidators()[0]
        .getName()
    ).toBe('notEmpty');
    expect(
      attribute
        .getType()
        .getValidators()[0]
        .getFunction()('Inception')
    ).toBe(true);
    expect(
      attribute
        .getType()
        .getValidators()[0]
        .getFunction()('')
    ).toBe(false);
  });

  test('Getting entities', async () => {
    let client = new ComponentClient(server);

    client = new ComponentClient(server, {version: 1});

    const {User, user} = client.getComponents();

    expect(isEntityClass(User)).toBe(true);
    expect(User.getComponentName()).toBe('User');

    expect(isComponentInstance(user)).toBe(true);
    expect(user.getComponentName()).toBe('user');

    let attribute = user.getAttribute('id');

    expect(isPrimaryIdentifierAttribute(attribute)).toBe(true);
    expect(attribute.getType().toString()).toBe('string');
    expect(typeof attribute.getDefaultValueFunction()).toBe('function');
    expect(attribute.getExposure()).toEqual({get: true, set: true});

    attribute = user.getAttribute('email');

    expect(isSecondaryIdentifierAttribute(attribute)).toBe(true);
    expect(attribute.getType().toString()).toBe('string');
    expect(attribute.getDefaultValueFunction()).toBeUndefined();
    expect(attribute.getExposure()).toEqual({get: true, set: true});
  });

  test('Invoking methods', async () => {
    const client = new ComponentClient(server, {version: 1});

    const {Movie} = client.getComponents();

    expect(() => Movie.find()).toThrow(/Received an unknown query/); // The token is missing

    Movie.token = 'abc123';

    let movies = Movie.find();

    expect(movies).toHaveLength(2);
    expect(movies[0]).toBeInstanceOf(Movie);
    expect(movies[0].title).toBe('Inception');
    expect(movies[1]).toBeInstanceOf(Movie);
    expect(movies[1].title).toBe('The Matrix');

    movies = Movie.find({limit: 1});

    expect(movies).toHaveLength(1);
    expect(movies[0]).toBeInstanceOf(Movie);
    expect(movies[0].title).toBe('Inception');

    let movie = Movie.prototype.deserialize({title: 'Inception'});

    movie = movie.play();

    expect(movie).toBeInstanceOf(Movie);

    // Since 'title' did not change, it should not be transported back to the local component
    expect(movie.getAttribute('title').isSet()).toBe(false);

    expect(movie.isPlaying).toBe(true);

    movie = Movie.prototype.deserialize({title: 'Inception'});

    // Because 'set' is not exposed, 'isPlaying' should not be transported to the remote component
    movie.isPlaying = true;

    movie = movie.play();
  });
});
