import {Component, isComponentClass} from '@liaison/component';
import type {ComponentServerLike} from '@liaison/component-server';
import isEqual from 'lodash/isEqual';

import {ComponentClient} from './component-client';

describe('ComponentClient', () => {
  const server: ComponentServerLike = {
    receive({query, components, version: clientVersion}) {
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
      if (
        isEqual({query, components}, {query: {'introspect=>': {'()': []}}, components: undefined})
      ) {
        return {
          result: {
            component: {
              name: 'Backend',
              providedComponents: [
                {
                  name: 'Session',
                  properties: [
                    {
                      name: 'token',
                      type: 'Attribute',
                      valueType: 'string?',
                      value: {__undefined: true},
                      exposure: {get: true, set: true}
                    }
                  ]
                },
                {
                  name: 'Movie',
                  mixins: ['Storable'],
                  properties: [{name: 'find', type: 'Method', exposure: {call: true}}],
                  prototype: {
                    properties: [
                      {
                        name: 'id',
                        type: 'PrimaryIdentifierAttribute',
                        valueType: 'string',
                        default: {
                          __function: 'function () {\nreturn this.constructor.generateId();\n}'
                        },
                        exposure: {get: true, set: true}
                      },
                      {
                        name: 'slug',
                        type: 'SecondaryIdentifierAttribute',
                        valueType: 'string',
                        exposure: {get: true, set: true}
                      },
                      {
                        name: 'title',
                        type: 'Attribute',
                        valueType: 'string',
                        default: {__function: "function () {\nreturn '';\n}"},
                        validators: [
                          {
                            name: 'notEmpty',
                            function: {__function: '(value) => value.length > 0'},
                            message: 'The validator `notEmpty()` failed'
                          }
                        ],
                        exposure: {get: true, set: true}
                      },
                      {
                        name: 'isPlaying',
                        type: 'Attribute',
                        valueType: 'boolean',
                        exposure: {get: true}
                      },
                      {name: 'play', type: 'Method', exposure: {call: true}},
                      {name: 'validateTitle', type: 'Method', exposure: {call: true}}
                    ]
                  },
                  consumedComponents: ['Session']
                }
              ]
            }
          }
        };
      }

      // Movie.find() without Session's token
      if (
        isEqual(
          {query, components},
          {
            query: {
              '<=': {__component: 'typeof Movie'},
              'find=>': {'()': []}
            },
            components: [{__component: 'typeof Session', token: {__undefined: true}}]
          }
        )
      ) {
        return {
          result: {__error: 'Access denied'}
        };
      }

      // Movie.find() with Session's token
      if (
        isEqual(
          {query, components},
          {
            query: {
              '<=': {__component: 'typeof Movie'},
              'find=>': {'()': []}
            },
            components: [{__component: 'typeof Session', token: 'abc123'}]
          }
        )
      ) {
        return {
          result: [
            {
              __component: 'Movie',
              id: 'movie1',
              slug: 'inception',
              title: 'Inception',
              isPlaying: false
            },
            {
              __component: 'Movie',
              id: 'movie2',
              slug: 'the-matrix',
              title: 'The Matrix',
              isPlaying: false
            }
          ]
        };
      }

      // Movie.find({limit: 1})
      if (
        isEqual(
          {query, components},
          {
            query: {
              '<=': {__component: 'typeof Movie'},
              'find=>': {'()': [{limit: 1}]}
            },
            components: [{__component: 'typeof Session', token: 'abc123'}]
          }
        )
      ) {
        return {
          result: [
            {
              __component: 'Movie',
              id: 'movie1',
              slug: 'inception',
              title: 'Inception',
              isPlaying: false
            }
          ]
        };
      }

      // movie.play()
      if (
        isEqual(
          {query, components},
          {
            query: {'<=': {__component: 'Movie', id: 'movie1'}, 'play=>': {'()': []}},
            components: [{__component: 'typeof Session', token: 'abc123'}]
          }
        )
      ) {
        return {
          result: {__component: 'Movie', id: 'movie1', isPlaying: true}
        };
      }

      // movie.validateTitle('')
      if (
        isEqual(
          {query, components},
          {
            query: {
              '<=': {__component: 'Movie', id: 'movie1', title: ''},
              'validateTitle=>': {'()': []}
            },
            components: [{__component: 'typeof Session', token: 'abc123'}]
          }
        )
      ) {
        return {
          result: false
        };
      }

      // movie.validateTitle('Inception 2')
      if (
        isEqual(
          {query, components},
          {
            query: {
              '<=': {__component: 'Movie', id: 'movie1', title: 'Inception 2'},
              'validateTitle=>': {'()': []}
            },
            components: [{__component: 'typeof Session', token: 'abc123'}]
          }
        )
      ) {
        return {
          result: true
        };
      }

      throw new Error(
        `Received an unknown request (query: ${JSON.stringify(query)}, components: ${JSON.stringify(
          components
        )})`
      );
    }
  };

  const Storable = (Base = Component) => {
    const _Storable = class extends Base {
      static isStorable() {}
      isStorable() {}
    };

    Object.defineProperty(_Storable, '__mixin', {value: 'Storable'});

    return _Storable;
  };

  test('Getting component', async () => {
    let client = new ComponentClient(server);

    expect(() => client.getComponent()).toThrow(
      "The component client version (undefined) doesn't match the component server version (1)"
    );

    client = new ComponentClient(server, {version: 1, mixins: [Storable]});

    const Backend = client.getComponent() as typeof Component;

    expect(isComponentClass(Backend)).toBe(true);
    expect(Backend.getComponentName()).toBe('Backend');

    const Session = Backend.getProvidedComponent('Session')!;

    expect(isComponentClass(Session)).toBe(true);
    expect(Session.getComponentName()).toBe('Session');

    let attribute = Session.getAttribute('token');

    expect(attribute.getValueType().toString()).toBe('string?');
    expect(attribute.getExposure()).toEqual({get: true, set: true});
    expect(attribute.getValue()).toBeUndefined();

    const Movie = Backend.getProvidedComponent('Movie')!;

    expect(isComponentClass(Movie)).toBe(true);
    expect(Movie.getComponentName()).toBe('Movie');
    expect(Movie.getConsumedComponent('Session')).toBe(Session);

    let method = Movie.getMethod('find');

    expect(method.getExposure()).toEqual({call: true});

    attribute = Movie.prototype.getPrimaryIdentifierAttribute();

    expect(attribute.getName()).toBe('id');
    expect(attribute.getValueType().toString()).toBe('string');
    expect(typeof attribute.getDefault()).toBe('function');
    expect(attribute.getExposure()).toEqual({get: true, set: true});

    attribute = Movie.prototype.getSecondaryIdentifierAttribute('slug');

    expect(attribute.getValueType().toString()).toBe('string');
    expect(attribute.getDefault()).toBeUndefined();
    expect(attribute.getExposure()).toEqual({get: true, set: true});

    attribute = Movie.prototype.getAttribute('title');

    expect(attribute.getValueType().toString()).toBe('string');
    expect(attribute.evaluateDefault()).toBe('');
    expect(attribute.getValueType().getValidators()).toHaveLength(1);
    expect(attribute.getExposure()).toEqual({get: true, set: true});

    attribute = Movie.prototype.getAttribute('isPlaying');

    expect(attribute.getValueType().toString()).toBe('boolean');
    expect(attribute.evaluateDefault()).toBe(undefined);
    expect(attribute.getExposure()).toEqual({get: true});
    expect(attribute.isControlled()).toBe(true);

    method = Movie.prototype.getMethod('play');

    expect(method.getExposure()).toEqual({call: true});

    method = Movie.prototype.getMethod('validateTitle');

    expect(method.getExposure()).toEqual({call: true});

    expect(typeof (Movie as any).isStorable).toBe('function');
  });

  test('Invoking methods', async () => {
    class BaseSession extends Component {
      static token?: string;
    }

    class BaseMovie extends Component {
      static Session: typeof BaseSession;

      // @ts-ignore
      static find({limit}: {limit?: number} = {}): BaseMovie[] {}

      id!: string;
      slug!: string;
      title = '';
      isPlaying = false;
      play() {}
      // @ts-ignore
      validateTitle(): boolean {}
    }

    class BaseBackend extends Component {
      static Session: typeof BaseSession;
      static Movie: typeof BaseMovie;
    }

    const client = new ComponentClient(server, {version: 1, mixins: [Storable]});

    const {Movie, Session} = client.getComponent() as typeof BaseBackend;

    expect(() => Movie.find()).toThrow('Access denied'); // The token is missing

    Session.token = 'abc123';

    let movies = Movie.find();

    expect(movies).toHaveLength(2);
    expect(movies[0]).toBeInstanceOf(Movie);
    expect(movies[0].id).toBe('movie1');
    expect(movies[0].slug).toBe('inception');
    expect(movies[0].title).toBe('Inception');
    expect(movies[1]).toBeInstanceOf(Movie);
    expect(movies[1].id).toBe('movie2');
    expect(movies[1].slug).toBe('the-matrix');
    expect(movies[1].title).toBe('The Matrix');

    movies = Movie.find({limit: 1});

    expect(movies).toHaveLength(1);
    expect(movies[0]).toBeInstanceOf(Movie);
    expect(movies[0].id).toBe('movie1');
    expect(movies[0].slug).toBe('inception');
    expect(movies[0].title).toBe('Inception');

    const movie = movies[0];

    movie.play();

    expect(movie.isPlaying).toBe(true);

    movie.title = '';

    expect(movie.validateTitle()).toBe(false);

    movie.title = 'Inception 2';

    expect(movie.validateTitle()).toBe(true);
  });
});
