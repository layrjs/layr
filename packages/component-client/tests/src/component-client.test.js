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

        if (isEqual(query, {'introspect=>': {'()': []}})) {
          return {
            components: [
              {
                name: 'Movie',
                properties: [{name: 'find', exposure: {call: true}}],
                prototype: {properties: [{name: 'title', exposure: {get: true, set: true}}]}
              }
            ]
          };
        }

        if (
          isEqual(query, {'<=': {__Component: 'Movie'}, 'find=>result': {'()': []}, '=>self': true})
        ) {
          return {
            result: [
              {__component: 'Movie', title: 'Inception'},
              {__component: 'Movie', title: 'The Matrix'}
            ],
            self: {__Component: 'Movie'}
          };
        }

        if (
          isEqual(query, {
            '<=': {__Component: 'Movie'},
            'find=>result': {'()': [{limit: 1}]},
            '=>self': true
          })
        ) {
          return {
            result: [{__component: 'Movie', title: 'Inception'}],
            self: {__Component: 'Movie'}
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

    const [Movie] = client.getComponents();

    expect(isComponent(Movie.prototype)).toBe(true);
    expect(Movie.getName()).toBe('Movie');

    expect(typeof Movie.find).toBe('function');

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
  });
});
