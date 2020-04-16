import {
  Component,
  expose,
  createComponentMap,
  getComponentFromComponentMap
} from '@liaison/component';
import {Model, attribute, validators} from '@liaison/model';
import {Entity, primaryIdentifier, secondaryIdentifier} from '@liaison/entity';

import {ComponentServer} from '../../..';

describe('ComponentServer', () => {
  test('Introspecting components', async () => {
    class Movie extends Component {
      @expose({call: true}) static find() {}
      @attribute() static limit;

      @expose({get: true, set: true}) title = '';
      @attribute() rating;
    }

    class Cinema extends Component {
      @expose({get: true}) @attribute() movies;
    }

    Cinema.registerRelatedComponent(Movie);

    const componentMap = createComponentMap([Movie, Cinema]);

    const componentProvider = {
      getComponent(name, {autoFork = true, cache}) {
        const Component = getComponentFromComponentMap(componentMap, name);

        if (autoFork) {
          let forkedComponents = cache.forkedComponents;

          if (forkedComponents === undefined) {
            forkedComponents = Object.create(null);
            cache.forkedComponents = forkedComponents;
          }

          let ForkedComponent = forkedComponents[name];

          if (ForkedComponent === undefined) {
            ForkedComponent = Component.fork();
            forkedComponents[name] = ForkedComponent;
          }

          return ForkedComponent;
        }

        return Component;
      },

      getComponentNames() {
        return Object.keys(componentMap);
      }
    };

    const server = new ComponentServer(componentProvider);

    const response = server.receiveQuery({query: {'introspect=>': {'()': []}}});

    expect(response).toStrictEqual({
      result: {
        components: [
          {
            name: 'Movie',
            type: 'Component',
            properties: [{name: 'find', type: 'method', exposure: {call: true}}],
            prototype: {
              properties: [
                {
                  name: 'title',
                  type: 'attribute',
                  default: {__function: "function () {\n        return '';\n      }"},
                  exposure: {get: true, set: true}
                }
              ]
            }
          },
          {
            name: 'Cinema',
            type: 'Component',
            relatedComponents: ['Movie'],
            prototype: {
              properties: [
                {
                  name: 'movies',
                  type: 'attribute',
                  exposure: {get: true}
                }
              ]
            }
          }
        ]
      }
    });

    expect(() => server.receiveQuery({query: {'introspect=>': {'()': []}}, version: 1})).toThrow(
      "The component client version (1) doesn't match the component server version (undefined)"
    );
  });

  test('Introspecting models', async () => {
    class Movie extends Model {
      @expose({get: true, set: true})
      @attribute('string', {validators: [validators.notEmpty()]})
      title;
    }

    const server = new ComponentServer([Movie]);

    const response = server.receiveQuery({query: {'introspect=>': {'()': []}}});

    expect(response).toStrictEqual({
      result: {
        components: [
          {
            name: 'Movie',
            type: 'Model',
            prototype: {
              properties: [
                {
                  name: 'title',
                  type: 'modelAttribute',
                  valueType: 'string',
                  validators: [
                    {
                      name: 'notEmpty',
                      function: {__function: 'value => value.length > 0'},
                      message: 'The validator `notEmpty()` failed'
                    }
                  ],
                  exposure: {get: true, set: true}
                }
              ]
            }
          }
        ]
      }
    });
  });

  test('Introspecting entities', async () => {
    class User extends Entity {
      @expose({get: true, set: true})
      @primaryIdentifier()
      id;

      @expose({get: true, set: true})
      @secondaryIdentifier()
      email;
    }

    const server = new ComponentServer([User]);

    const response = server.receiveQuery({query: {'introspect=>': {'()': []}}});

    expect(response).toStrictEqual({
      result: {
        components: [
          {
            name: 'User',
            type: 'Entity',
            prototype: {
              properties: [
                {
                  name: 'id',
                  type: 'primaryIdentifierAttribute',
                  exposure: {get: true, set: true},
                  default: {
                    __function: 'function () {\n    return this.constructor.generateId();\n  }'
                  },
                  valueType: 'string'
                },
                {
                  name: 'email',
                  type: 'secondaryIdentifierAttribute',
                  exposure: {get: true, set: true},
                  valueType: 'string'
                }
              ]
            }
          }
        ]
      }
    });
  });

  test('Accessing attributes', async () => {
    class Movie extends Component {
      @attribute() static limit = 100;
      @expose({get: true, set: true}) static offset = 0;

      @expose({get: true, set: true}) title = '';
      @attribute() rating;
    }

    const server = new ComponentServer([Movie]);

    expect(
      server.receiveQuery({
        query: {'<=': {__component: 'Movie'}}
      })
    ).toStrictEqual({
      result: {__component: 'Movie'},
      components: [{__component: 'Movie', offset: 0}]
    });

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'Movie'},
          'offset': true
        }
      })
    ).toStrictEqual({result: {offset: 0}});

    expect(() =>
      server.receiveQuery({
        query: {
          '<=': {__component: 'Movie'},
          'limit': true
        }
      })
    ).toThrow("Cannot get the value of an attribute that is not allowed (name: 'limit')");

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie', __new: true}
        }
      })
    ).toStrictEqual({
      result: {__component: 'movie', __new: true, title: ''},
      components: [{__component: 'Movie', offset: 0}]
    });

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie', __new: true},
          'title': true
        },
        components: [{__component: 'Movie', offset: 0}]
      })
    ).toStrictEqual({result: {title: ''}, components: [{__component: 'Movie', offset: 0}]});

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie', __new: true, title: 'Inception'}
        }
      })
    ).toStrictEqual({
      result: {__component: 'movie', __new: true, title: 'Inception'},
      components: [{__component: 'Movie', offset: 0}]
    });

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie', __new: true, title: 'Inception'},
          'title': true
        }
      })
    ).toStrictEqual({result: {title: 'Inception'}});

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie'}
        }
      })
    ).toStrictEqual({
      result: {__component: 'movie'},
      components: [{__component: 'Movie', offset: 0}]
    });

    expect(() =>
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie'},
          'title': true
        }
      })
    ).toThrow(
      "Cannot get the value of an unset attribute (component name: 'movie', attribute name: 'title')"
    );

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie', rating: 10}
        }
      })
    ).toStrictEqual({
      result: {__component: 'movie'},
      components: [{__component: 'Movie', offset: 0}]
    });

    expect(() =>
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie', rating: 10},
          'rating': true
        }
      })
    ).toThrow(
      "Cannot get the value of an unset attribute (component name: 'movie', attribute name: 'rating')"
    );
  });

  test('Invoking methods', async () => {
    class Movie extends Component {
      @expose({call: true}) static exposedClassMethod() {
        return 'exposedClassMethod()';
      }

      @expose({call: true}) static async exposedAsyncClassMethod() {
        return 'exposedAsyncClassMethod()';
      }

      static unexposedClassMethod() {
        return 'unexposedClassMethod()';
      }

      @expose({call: true}) exposedInstanceMethod() {
        return 'exposedInstanceMethod()';
      }

      @expose({call: true}) async exposedAsyncInstanceMethod() {
        return 'exposedAsyncInstanceMethod()';
      }

      unexposedInstanceMethod() {
        return 'unexposedInstanceMethod()';
      }

      @expose({call: true}) exposedInstanceMethodWithParameters(param1, param2) {
        return `exposedInstanceMethodWithParameters(${param1}, ${param2})`;
      }
    }

    const server = new ComponentServer([Movie]);

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'Movie'},
          'exposedClassMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedClassMethod()'});

    expect(
      await server.receiveQuery({
        query: {
          '<=': {__component: 'Movie'},
          'exposedAsyncClassMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedAsyncClassMethod()'});

    expect(() =>
      server.receiveQuery({
        query: {
          '<=': {__component: 'Movie'},
          'unexposedClassMethod=>': {
            '()': []
          }
        }
      })
    ).toThrow("Cannot execute a method that is not allowed (name: 'unexposedClassMethod')");

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie'},
          'exposedInstanceMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedInstanceMethod()'});

    expect(
      await server.receiveQuery({
        query: {
          '<=': {__component: 'movie'},
          'exposedAsyncInstanceMethod=>': {
            '()': []
          }
        }
      })
    ).toStrictEqual({result: 'exposedAsyncInstanceMethod()'});

    expect(() =>
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie'},
          'unexposedInstanceMethod=>': {
            '()': []
          }
        }
      })
    ).toThrow("Cannot execute a method that is not allowed (name: 'unexposedInstanceMethod')");

    expect(
      server.receiveQuery({
        query: {
          '<=': {__component: 'movie'},
          'exposedInstanceMethodWithParameters=>': {
            '()': [1, 2]
          }
        }
      })
    ).toStrictEqual({result: 'exposedInstanceMethodWithParameters(1, 2)'});
  });
});
