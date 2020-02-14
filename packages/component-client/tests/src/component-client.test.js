import {isComponent} from '@liaison/component';
import isEqual from 'lodash/isEqual';

import {ComponentClient} from '../../..';

describe('ComponentClient', () => {
  test('Getting components', async () => {
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
                properties: [
                  {name: 'token', type: 'attribute', exposure: {get: true, set: true}},
                  {name: 'find', type: 'method', exposure: {call: true}}
                ],
                prototype: {
                  properties: [
                    {name: 'title', type: 'attribute', exposure: {get: true, set: true}},
                    {name: 'isPlaying', type: 'attribute', exposure: {get: true}},
                    {name: 'play', type: 'method', exposure: {call: true}}
                  ]
                }
              }
            ]
          };
        }

        // Movie.find()
        if (
          isEqual(query, {
            '<=': {__Component: 'Movie', token: 'abc123'},
            'find=>result': {'()': []},
            '=>self': true
          })
        ) {
          return {
            result: [
              {__component: 'Movie', title: 'Inception'},
              {__component: 'Movie', title: 'The Matrix'}
            ],
            self: {__Component: 'Movie', token: 'abc123'}
          };
        }

        // Movie.find({limit: 1})
        if (
          isEqual(query, {
            '<=': {__Component: 'Movie', token: 'abc123'},
            'find=>result': {'()': [{limit: 1}]},
            '=>self': true
          })
        ) {
          return {
            result: [{__component: 'Movie', title: 'Inception'}],
            self: {__Component: 'Movie', token: 'abc123'}
          };
        }

        // movie.play()
        if (
          isEqual(query, {
            '<=': {__component: 'Movie', title: 'Inception'},
            'play=>result': {'()': []},
            '=>self': true
          })
        ) {
          return {
            result: {__component: 'Movie', isPlaying: true},
            self: {__component: 'Movie', isPlaying: true}
          };
        }

        throw new Error(`Received an unknown query: ${JSON.stringify(query)}`);
      }
    };

    let client = new ComponentClient(server);

    expect(() => client.getComponents()).toThrow(
      "The component client version (undefined) doesn't match the component server version (1)"
    );

    client = new ComponentClient(server, {version: 1});

    const [RemoteMovie] = client.getComponents();

    expect(isComponent(RemoteMovie.prototype)).toBe(true);
    expect(RemoteMovie.getName()).toBe('Movie');
    expect(RemoteMovie.getAttribute('token').getExposure()).toEqual({get: true, set: true});
    expect(typeof RemoteMovie.find).toBe('function');
    expect(RemoteMovie.prototype.getAttribute('title').getExposure()).toEqual({
      get: true,
      set: true
    });
    expect(RemoteMovie.prototype.getAttribute('isPlaying').getExposure()).toEqual({get: true});
    expect(typeof RemoteMovie.prototype.play).toBe('function');

    class Movie extends RemoteMovie {}

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

    let movie = Movie.instantiate();
    movie.title = 'Inception';

    movie = movie.play();

    expect(movie).toBeInstanceOf(Movie);

    // Since 'title' did not change, it should not be transported back to the local component
    expect(movie.getAttribute('title').isActive()).toBe(false);

    expect(movie.isPlaying).toBe(true);

    movie = Movie.instantiate();
    movie.title = 'Inception';

    // Because 'set' is not exposed, 'isPlaying' should not be transported to the remote component
    movie.isPlaying = true;

    movie = movie.play();
  });
});
